// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IAggregatorV3.sol";
import "./interfaces/IAPI3.sol";
import "./interfaces/IUniswapV3Oracle.sol";
import "./TellorAdapter.sol";
import "./API3Adapter.sol";
import "./utils/OracleLib.sol";
import "./utils/TWAPCalculator.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

/**
 * @title PriceAggregator
 * @dev Aggregates price data from multiple oracles (Chainlink, Uniswap, Tellor, API3)
 * to provide robust and manipulation-resistant price feeds for DeFi applications
 */
contract PriceAggregator is Ownable, ReentrancyGuard {
    // Replace using statements with contract instance variables
    OracleLib public oracleLib;
    TWAPCalculator public twapCalculator;
    using SafeCast for uint256;
    using SafeCast for int256;
    
    struct OracleSource {
        address oracle;
        uint8 oracleType; // 0: Chainlink, 1: Uniswap, 2: Tellor, 3: API3
        uint256 weight;
        uint256 heartbeatSeconds; // Maximum allowed time since last update
        string description; // Description of the pair (e.g. "ETH/USD")
        uint8 decimals; // Decimal precision of the price feed
    }
    
    // Asset pair tracking
    struct AssetPair {
        string symbol;
        string baseAsset;
        string quoteAsset;
        address[] sources;
        bool active;
    }
    
    OracleSource[] public sources;
    mapping(string => AssetPair) public assetPairs; // e.g. "ETH-USD" => AssetPair
    string[] public supportedPairs;
    
    // Pricing config
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public minOracleResponses = 1; // Minimum number of oracles needed for aggregation
    uint256 public stalenessThreshold = 3600; // Default 1 hour staleness threshold
    
    // Events
    event OracleSourceAdded(address indexed oracle, uint8 oracleType, uint256 weight);
    event OracleSourceRemoved(address indexed oracle);
    event OracleSourceUpdated(address indexed oracle, uint256 weight);
    event PriceUpdated(string pair, int256 medianPrice, int256 weightedPrice);
    event AssetPairAdded(string symbol, string baseAsset, string quoteAsset);
    event AssetPairUpdated(string symbol, bool active);
    event TellorDataDisputed(address indexed oracle, uint256 timestamp);

constructor(
        OracleSource[] memory _sources,
        address _oracleLib,
        address _twapCalculator
    ) {
        require(_sources.length > 0, "No sources provided");
        require(_oracleLib != address(0), "Invalid OracleLib address");
        require(_twapCalculator != address(0), "Invalid TWAPCalculator address");
        
        // Initialize contract references
        oracleLib = OracleLib(_oracleLib);
        twapCalculator = TWAPCalculator(_twapCalculator);
        
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < _sources.length; i++) {
            require(_sources[i].oracle != address(0), "Invalid oracle address");
            require(_sources[i].weight > 0, "Weight must be positive");
            
            sources.push(_sources[i]);
            totalWeight += _sources[i].weight;
            
            emit OracleSourceAdded(
                _sources[i].oracle, 
                _sources[i].oracleType, 
                _sources[i].weight
            );
        }
        
        require(totalWeight > 0, "Total weight must be positive");
    }

    /**
     * @notice Returns median price from all configured oracles
     * @return median price with PRICE_PRECISION decimals
     */
    function getMedianPrice(string memory pairSymbol) public view returns (int256) {
        AssetPair storage pair = assetPairs[pairSymbol];
        require(pair.active, "Asset pair not active");
        require(pair.sources.length > 0, "No sources for asset pair");
        
        int256[] memory allPrices = new int256[](pair.sources.length);
        uint256 validPrices = 0;
        
        for (uint256 i = 0; i < pair.sources.length; i++) {
            uint256 sourceIndex = getSourceIndex(pair.sources[i]);
            // Copy struct to memory to avoid read-only error
            OracleSource memory src = sources[sourceIndex];
            try this.fetchPriceFromSource(src) returns (int256 price) {
                if (price > 0) {
                    allPrices[validPrices] = normalizePrice(price, src.decimals);
                    validPrices++;
                }
            } catch {
                // Skip failed oracle
            }
        }
        
        require(validPrices >= minOracleResponses, "Insufficient valid prices");
        
        // Create a new array with only valid prices
        int256[] memory validPricesArray = new int256[](validPrices);
        for (uint256 i = 0; i < validPrices; i++) {
            validPricesArray[i] = allPrices[i];
        }
        
        int256 medianPrice = oracleLib.getMedian(validPricesArray);
        return medianPrice;
    }

    /**
     * @notice Returns weighted average price from all configured oracles
     * @return weighted price with PRICE_PRECISION decimals
     */
    function getWeightedPrice(string memory pairSymbol) public view returns (int256) {
        AssetPair storage pair = assetPairs[pairSymbol];
        require(pair.active, "Asset pair not active");
        require(pair.sources.length > 0, "No sources for asset pair");
        
        int256[] memory validPrices = new int256[](pair.sources.length);
        uint256[] memory validWeights = new uint256[](pair.sources.length);
        uint256 validCount = 0;
        
        for (uint256 i = 0; i < pair.sources.length; i++) {
            uint256 sourceIndex = getSourceIndex(pair.sources[i]);
            // Copy struct to memory to avoid read-only error
            OracleSource memory src = sources[sourceIndex];
            try this.fetchPriceFromSource(src) returns (int256 price) {
                if (price > 0) {
                    validPrices[validCount] = normalizePrice(price, src.decimals);
                    validWeights[validCount] = src.weight;
                    validCount++;
                }
            } catch {
                // Skip failed oracle
            }
        }
        
        require(validCount >= minOracleResponses, "Insufficient valid sources");
        
        // Calculate weighted average
        int256 sum = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < validCount; i++) {
            sum += validPrices[i] * int256(validWeights[i]);
            totalWeight += validWeights[i];
        }
        
        require(totalWeight > 0, "No weight");
        return sum / int256(totalWeight);
    }

    /**
     * @notice Returns both median and weighted prices for an asset pair
     * @param pairSymbol The symbol of the asset pair (e.g., "ETH-USD")
     * @return medianPrice The median price across all sources
     * @return weightedPrice The weighted average price across all sources
     */
    function getAggregatedPrice(string memory pairSymbol) external view returns (int256 medianPrice, int256 weightedPrice) {
        medianPrice = getMedianPrice(pairSymbol);
        weightedPrice = getWeightedPrice(pairSymbol);
        return (medianPrice, weightedPrice);
    }

    /**
     * @notice Get prices from all sources for a specific asset pair with enhanced Tellor data
     * @param pairSymbol The symbol of the asset pair
     * @return prices Array of prices from each source
     * @return sourceTypes Array of oracle types corresponding to each price
     * @return descriptions Array of descriptions for each source
     * @return timestamps Array of timestamps for each price update
     * @return disputeStatus Array indicating if Tellor data is disputed
     */
    function getAllPricesWithStatus(string memory pairSymbol) external view returns (
        int256[] memory prices, 
        uint8[] memory sourceTypes,
        string[] memory descriptions,
        uint256[] memory timestamps,
        bool[] memory disputeStatus
    ) {
        AssetPair storage pair = assetPairs[pairSymbol];
        require(pair.active, "Asset pair not active");
        
        uint256 length = pair.sources.length;
        prices = new int256[](length);
        sourceTypes = new uint8[](length);
        descriptions = new string[](length);
        timestamps = new uint256[](length);
        disputeStatus = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 sourceIndex = getSourceIndex(pair.sources[i]);
            OracleSource memory src = sources[sourceIndex];
            
            // Get raw price and timestamp with dispute status
            (int256 price, uint256 timestamp, bool isDisputed) = getRawPriceTimestampAndDispute(src);
            
            prices[i] = normalizePrice(price, src.decimals);
            sourceTypes[i] = src.oracleType;
            descriptions[i] = src.description;
            timestamps[i] = timestamp;
            disputeStatus[i] = isDisputed;
        }
        
        return (prices, sourceTypes, descriptions, timestamps, disputeStatus);
    }

    /**
     * @notice Get prices from all sources for a specific asset pair (backward compatibility)
     * @param pairSymbol The symbol of the asset pair
     * @return prices Array of prices from each source
     * @return sourceTypes Array of oracle types corresponding to each price
     * @return descriptions Array of descriptions for each source
     * @return timestamps Array of timestamps for each price update
     */
    function getAllPrices(string memory pairSymbol) external view returns (
        int256[] memory prices, 
        uint8[] memory sourceTypes,
        string[] memory descriptions,
        uint256[] memory timestamps
    ) {
        AssetPair storage pair = assetPairs[pairSymbol];
        require(pair.active, "Asset pair not active");
        
        uint256 length = pair.sources.length;
        prices = new int256[](length);
        sourceTypes = new uint8[](length);
        descriptions = new string[](length);
        timestamps = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 sourceIndex = getSourceIndex(pair.sources[i]);
            OracleSource memory src = sources[sourceIndex];
            
            // Get raw price and timestamp
            (int256 price, uint256 timestamp) = getRawPriceAndTimestamp(src);
            
            prices[i] = normalizePrice(price, src.decimals);
            sourceTypes[i] = src.oracleType;
            descriptions[i] = src.description;
            timestamps[i] = timestamp;
        }
        
        return (prices, sourceTypes, descriptions, timestamps);
    }

    /**
     * @notice Get multiple historical values for Tellor sources for trend analysis
     * @param tellorAdapter The TellorAdapter address
     * @param maxAge Maximum age in seconds to look back
     * @param maxCount Maximum number of values to return
     * @return values Array of historical price values
     * @return timestamps Array of corresponding timestamps
     */
    function getTellorHistoricalData(address tellorAdapter, uint256 maxAge, uint256 maxCount) 
        external 
        view 
        returns (uint256[] memory values, uint256[] memory timestamps) 
    {
        require(tellorAdapter != address(0), "Invalid Tellor adapter");
        
        // Verify this is actually a Tellor source
        bool isTellorSource = false;
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i].oracle == tellorAdapter && sources[i].oracleType == 2) {
                isTellorSource = true;
                break;
            }
        }
        require(isTellorSource, "Not a registered Tellor source");
        
        return TellorAdapter(tellorAdapter).getMultipleValues(maxAge, maxCount);
    }

    /**
     * @notice Fetches price from a specific oracle source with enhanced Tellor support
     * @param src Oracle source details
     * @return The raw price from the oracle
     */
    function fetchPriceFromSource(OracleSource memory src) public view returns (int256) {
        if (src.oracleType == 0) {
            // Chainlink
            (
                , 
                int256 answer, 
                , 
                uint256 updatedAt, 
            ) = IAggregatorV3(src.oracle).latestRoundData();
            
            require(updatedAt > 0, "Chainlink price not updated");
            require(block.timestamp - updatedAt <= src.heartbeatSeconds, "Chainlink price is stale");
            require(answer > 0, "Invalid Chainlink price");
            
            return answer;
        } else if (src.oracleType == 1) {
            // Uniswap
            int256 twap = twapCalculator.getTWAP(IUniswapV3Oracle(src.oracle));
            require(twap > 0, "Invalid Uniswap TWAP");
            return twap;
        } else if (src.oracleType == 2) {
            // Enhanced Tellor with dispute checking and custom age
            TellorAdapter tellorAdapter = TellorAdapter(src.oracle);
            
            // First try to get latest value with custom age requirement
            try tellorAdapter.getLatestValueWithAge(src.heartbeatSeconds) returns (int256 tellorPrice, uint256 tellorTimestamp) {
                if (tellorPrice > 0 && tellorTimestamp > 0) {
                    return tellorPrice;
                }
            } catch {
                // If custom age fails, try the standard method
                try tellorAdapter.getLatestValue() returns (int256 standardPrice) {
                    if (standardPrice > 0) {
                        return standardPrice;
                    }
                } catch {
                    // As a last resort, use the legacy method
                    uint256 legacyPrice = tellorAdapter.retrieveData();
                    require(legacyPrice > 0, "No valid Tellor data available");
                    return int256(legacyPrice);
                }
            }
            
            revert("No valid Tellor data");
        } else if (src.oracleType == 3) {
            // API3 - Call the adapter's getLatestValue method, not getLatestPrice
            API3Adapter api3Adapter = API3Adapter(src.oracle);
            int256 price = api3Adapter.getLatestValue();
            require(price > 0, "Invalid API3 price");
            return price;
        }
        
        revert("Invalid oracle type");
    }

    /**
     * @notice Returns raw price and timestamp from a source with enhanced Tellor support
     */
    function getRawPriceAndTimestamp(OracleSource memory src) internal view returns (int256 price, uint256 timestamp) {
        if (src.oracleType == 0) {
            // Chainlink
            (
                , 
                int256 answer, 
                , 
                uint256 updatedAt, 
            ) = IAggregatorV3(src.oracle).latestRoundData();
            
            return (answer, updatedAt);
        } else if (src.oracleType == 1) {
            // Uniswap - we don't get a timestamp from TWAP
            return (twapCalculator.getTWAP(IUniswapV3Oracle(src.oracle)), block.timestamp);
        } else if (src.oracleType == 2) {
            // Enhanced Tellor with actual timestamp
            TellorAdapter tellorAdapter = TellorAdapter(src.oracle);
            
            try tellorAdapter.getLatestValueWithAge(src.heartbeatSeconds) returns (int256 tellorPrice, uint256 tellorTimestamp) {
                return (tellorPrice, tellorTimestamp);
            } catch {
                // Fallback to legacy method
                uint256 legacyPrice = tellorAdapter.retrieveData();
                uint256 lastTimestamp = tellorAdapter.getLastUpdateTimestamp();
                return (int256(legacyPrice), lastTimestamp);
            }
        } else if (src.oracleType == 3) {
            // API3 - Call the adapter's getLatestValueWithAge method
            API3Adapter api3Adapter = API3Adapter(src.oracle);
            try api3Adapter.getLatestValueWithAge(src.heartbeatSeconds) returns (int256 api3Price, uint256 api3Timestamp) {
                return (api3Price, api3Timestamp);
            } catch {
                // Fallback to basic method
                int256 api3Price = api3Adapter.getLatestValue();
                uint256 api3Timestamp = api3Adapter.getLastUpdateTimestamp();
                return (api3Price, api3Timestamp);
            }
        }
        
        revert("Invalid oracle type");
    }

    /**
     * @notice Returns raw price, timestamp, and dispute status from a source
     */
    function getRawPriceTimestampAndDispute(OracleSource memory src) internal view returns (int256 price, uint256 timestamp, bool isDisputed) {
        if (src.oracleType == 2) {
            // Enhanced Tellor with dispute checking
            TellorAdapter tellorAdapter = TellorAdapter(src.oracle);
            
            try tellorAdapter.getLatestValueWithAge(src.heartbeatSeconds) returns (int256 tellorPrice, uint256 tellorTimestamp) {
                bool disputed = tellorAdapter.isDisputed(tellorTimestamp);
                return (tellorPrice, tellorTimestamp, disputed);
            } catch {
                // Fallback to legacy method
                uint256 legacyPrice = tellorAdapter.retrieveData();
                uint256 lastTimestamp = tellorAdapter.getLastUpdateTimestamp();
                bool disputed = false;
                if (lastTimestamp > 0) {
                    disputed = tellorAdapter.isDisputed(lastTimestamp);
                }
                return (int256(legacyPrice), lastTimestamp, disputed);
            }
        } else {
            // For non-Tellor sources, get price and timestamp normally
            (int256 sourcePrice, uint256 sourceTimestamp) = getRawPriceAndTimestamp(src);
            return (sourcePrice, sourceTimestamp, false); // Non-Tellor sources don't have dispute mechanism
        }
    }

    /**
     * @notice Get detailed Tellor analytics for a specific adapter
     * @param tellorAdapter The TellorAdapter address
     * @return valueCount Total number of values submitted
     * @return lastReporter Address of the last reporter
     * @return lastTimestamp Timestamp of last update
     * @return isLastDisputed Whether the last value is disputed
     */
    function getTellorAnalytics(address tellorAdapter) external view returns (
        uint256 valueCount,
        address lastReporter,
        uint256 lastTimestamp,
        bool isLastDisputed
    ) {
        require(tellorAdapter != address(0), "Invalid Tellor adapter");
        
        // Verify this is actually a Tellor source
        bool isTellorSource = false;
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i].oracle == tellorAdapter && sources[i].oracleType == 2) {
                isTellorSource = true;
                break;
            }
        }
        require(isTellorSource, "Not a registered Tellor source");
        
        TellorAdapter adapter = TellorAdapter(tellorAdapter);
        
        valueCount = adapter.getValueCount();
        lastTimestamp = adapter.getLastUpdateTimestamp();
        
        if (lastTimestamp > 0) {
            lastReporter = adapter.getReporter(lastTimestamp);
            isLastDisputed = adapter.isDisputed(lastTimestamp);
        }
        
        return (valueCount, lastReporter, lastTimestamp, isLastDisputed);
    }

    /**
     * @notice Check if any Tellor sources have disputed data
     * @param pairSymbol The asset pair to check
     * @return hasDisputedData Whether any Tellor source has disputed data
     * @return disputedSources Array of disputed Tellor source addresses
     */
    function checkTellorDisputes(string memory pairSymbol) external view returns (
        bool hasDisputedData,
        address[] memory disputedSources
    ) {
        AssetPair storage pair = assetPairs[pairSymbol];
        require(pair.active, "Asset pair not active");
        
        address[] memory tempDisputed = new address[](pair.sources.length);
        uint256 disputedCount = 0;
        
        for (uint256 i = 0; i < pair.sources.length; i++) {
            uint256 sourceIndex = getSourceIndex(pair.sources[i]);
            OracleSource memory src = sources[sourceIndex];
            
            if (src.oracleType == 2) { // Tellor
                TellorAdapter adapter = TellorAdapter(src.oracle);
                uint256 lastTimestamp = adapter.getLastUpdateTimestamp();
                
                if (lastTimestamp > 0 && adapter.isDisputed(lastTimestamp)) {
                    tempDisputed[disputedCount] = src.oracle;
                    disputedCount++;
                    hasDisputedData = true;
                }
            }
        }
        
        // Resize the array to actual disputed count
        disputedSources = new address[](disputedCount);
        for (uint256 i = 0; i < disputedCount; i++) {
            disputedSources[i] = tempDisputed[i];
        }
        
        return (hasDisputedData, disputedSources);
    }

    /**
     * @notice Normalizes price to PRICE_PRECISION decimals
     */
    function normalizePrice(int256 price, uint8 decimals) internal pure returns (int256) {
        if (decimals < 18) {
            return price * int256(10 ** (18 - decimals));
        } else if (decimals > 18) {
            return price / int256(10 ** (decimals - 18));
        }
        return price;
    }
    /**
     * @notice Get index of a source in the sources array
     */
    function getSourceIndex(address oracle) public view returns (uint256) {
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i].oracle == oracle) {
                return i;
            }
        }
        revert("Oracle not found");
    }

    // ===== Admin functions =====

    /**
     * @notice Adds a new oracle source
     */
    function addOracleSource(OracleSource memory src) external onlyOwner {
        require(src.oracle != address(0), "Invalid oracle address");
        require(src.weight > 0, "Weight must be positive");
        
        sources.push(src);
        emit OracleSourceAdded(src.oracle, src.oracleType, src.weight);
    }

    /**
     * @notice Removes an oracle source
     */
    function removeOracleSource(address oracle) external onlyOwner {
        uint256 index = 0;
        bool found = false;
        
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i].oracle == oracle) {
                index = i;
                found = true;
                break;
            }
        }
        
        require(found, "Oracle not found");
        
        // Remove the oracle by swapping with the last element and popping
        sources[index] = sources[sources.length - 1];
        sources.pop();
        
        emit OracleSourceRemoved(oracle);
    }

    /**
     * @notice Updates an existing oracle source weight
     */
    function updateOracleWeight(address oracle, uint256 newWeight) external onlyOwner {
        require(newWeight > 0, "Weight must be positive");
        
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i].oracle == oracle) {
                sources[i].weight = newWeight;
                emit OracleSourceUpdated(oracle, newWeight);
                return;
            }
        }
        
        revert("Oracle not found");
    }

    /**
     * @notice Adds a new asset pair
     */
    function addAssetPair(
        string memory symbol,
        string memory baseAsset,
        string memory quoteAsset,
        address[] memory pairSources
    ) external onlyOwner {
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(bytes(baseAsset).length > 0, "Base asset cannot be empty");
        require(bytes(quoteAsset).length > 0, "Quote asset cannot be empty");
        require(pairSources.length > 0, "Must provide at least one source");
        
        // Check all sources exist
        for (uint256 i = 0; i < pairSources.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < sources.length; j++) {
                if (sources[j].oracle == pairSources[i]) {
                    found = true;
                    break;
                }
            }
            require(found, "Oracle source not registered");
        }
        
        assetPairs[symbol] = AssetPair({
            symbol: symbol,
            baseAsset: baseAsset,
            quoteAsset: quoteAsset,
            sources: pairSources,
            active: true
        });
        
        supportedPairs.push(symbol);
        emit AssetPairAdded(symbol, baseAsset, quoteAsset);
    }

    /**
     * @notice Updates the active status of an asset pair
     */
    function setAssetPairStatus(string memory symbol, bool active) external onlyOwner {
        require(bytes(assetPairs[symbol].symbol).length > 0, "Asset pair does not exist");
        
        assetPairs[symbol].active = active;
        emit AssetPairUpdated(symbol, active);
    }

    /**
     * @notice Updates the required minimum number of oracle responses
     */
    function setMinOracleResponses(uint256 _minResponses) external onlyOwner {
        minOracleResponses = _minResponses;
    }

    /**
     * @notice Updates the staleness threshold in seconds
     */
    function setStalenessThreshold(uint256 _stalenessThreshold) external onlyOwner {
        stalenessThreshold = _stalenessThreshold;
    }

    /**
     * @notice Returns the number of supported asset pairs
     */
    function getSupportedPairsCount() external view returns (uint256) {
        return supportedPairs.length;
    }

    /**
     * @notice Returns all sources for a specific asset pair
     */
    function getAssetPairSources(string memory symbol) external view returns (address[] memory) {
        return assetPairs[symbol].sources;
    }

    /**
     * @notice Returns all registered oracle sources
     */
    function getSources() external view returns (OracleSource[] memory) {
        return sources;
    }
}