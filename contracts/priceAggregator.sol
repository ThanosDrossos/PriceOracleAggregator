pragma solidity ^0.8.0;

import "./interfaces/IAggregatorV3.sol";
import "./interfaces/IAPI3.sol";
import "./interfaces/ITellor.sol";
import "./interfaces/IUniswapV3Oracle.sol";
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
    using OracleLib for int256[];
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

    constructor(OracleSource[] memory _sources) {
        require(_sources.length > 0, "No sources provided");
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
        
        int256[] memory prices = new int256[](pair.sources.length);
        uint256 validPrices = 0;
        
        for (uint256 i = 0; i < pair.sources.length; i++) {
            try this.fetchPriceFromSource(sources[getSourceIndex(pair.sources[i])]) returns (int256 price) {
                if (price > 0) {
                    prices[validPrices] = normalizePrice(price, sources[getSourceIndex(pair.sources[i])].decimals);
                    validPrices++;
                }
            } catch {
                // Skip failed oracle
            }
        }
        
        require(validPrices >= minOracleResponses, "Insufficient valid prices");
        
        // Resize the array to only include valid prices
        assembly {
            mstore(prices, validPrices)
        }
        
        int256 medianPrice = prices.getMedian();
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
        
        int256 sum = 0;
        uint256 totalWeight = 0;
        uint256 validSources = 0;
        
        for (uint256 i = 0; i < pair.sources.length; i++) {
            uint256 sourceIndex = getSourceIndex(pair.sources[i]);
            try this.fetchPriceFromSource(sources[sourceIndex]) returns (int256 price) {
                if (price > 0) {
                    sum += normalizePrice(price, sources[sourceIndex].decimals) * int256(sources[sourceIndex].weight);
                    totalWeight += sources[sourceIndex].weight;
                    validSources++;
                }
            } catch {
                // Skip failed oracle
            }
        }
        
        require(validSources >= minOracleResponses, "Insufficient valid sources");
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
     * @notice Get prices from all sources for a specific asset pair
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
     * @notice Fetches price from a specific oracle source
     * @param src Oracle source details
     * @return The raw price from the oracle
     */
    function fetchPriceFromSource(OracleSource memory src) public view returns (int256) {
        if (src.oracleType == 0) {
            // Chainlink
            (
                uint80 roundID, 
                int256 answer, 
                uint256 startedAt, 
                uint256 updatedAt, 
                uint80 answeredInRound
            ) = IAggregatorV3(src.oracle).latestRoundData();
            
            require(updatedAt > 0, "Chainlink price not updated");
            require(block.timestamp - updatedAt <= src.heartbeatSeconds, "Chainlink price is stale");
            require(answer > 0, "Invalid Chainlink price");
            
            return answer;
        } else if (src.oracleType == 1) {
            // Uniswap
            int256 twap = TWAPCalculator.getTWAP(IUniswapV3Oracle(src.oracle));
            require(twap > 0, "Invalid Uniswap TWAP");
            return twap;
        } else if (src.oracleType == 2) {
            // Tellor
            int256 price = ITellor(src.oracle).getLatestValue();
            require(price > 0, "Invalid Tellor price");
            return price;
        } else if (src.oracleType == 3) {
            // API3
            int256 price = IAPI3(src.oracle).getLatestPrice();
            require(price > 0, "Invalid API3 price");
            return price;
        }
        
        revert("Invalid oracle type");
    }

    /**
     * @notice Returns raw price and timestamp from a source
     */
    function getRawPriceAndTimestamp(OracleSource memory src) internal view returns (int256 price, uint256 timestamp) {
        if (src.oracleType == 0) {
            // Chainlink
            (
                uint80 roundID, 
                int256 answer, 
                uint256 startedAt, 
                uint256 updatedAt, 
                uint80 answeredInRound
            ) = IAggregatorV3(src.oracle).latestRoundData();
            
            return (answer, updatedAt);
        } else if (src.oracleType == 1) {
            // Uniswap - we don't get a timestamp from TWAP
            return (TWAPCalculator.getTWAP(IUniswapV3Oracle(src.oracle)), block.timestamp);
        } else if (src.oracleType == 2) {
            // Tellor
            return (ITellor(src.oracle).getLatestValue(), block.timestamp);
        } else if (src.oracleType == 3) {
            // API3
            return (IAPI3(src.oracle).getLatestPrice(), block.timestamp);
        }
        
        revert("Invalid oracle type");
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
    function getSourceIndex(address oracle) internal view returns (uint256) {
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
}