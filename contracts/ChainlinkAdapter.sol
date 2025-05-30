// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IAggregatorV3.sol";

/**
 * @title ChainlinkAdapter
 * @dev Adapter contract that standardizes the Chainlink oracle interface for our PriceAggregator
 */
contract ChainlinkAdapter {
    IAggregatorV3 public immutable dataFeed;
    string public asset;
    string public currency;
    uint256 public immutable heartbeat;
    uint8 public immutable decimals;
    
    // Events for better tracking
    event PriceRetrieved(int256 value, uint256 timestamp, uint80 roundId);
    event StaleDataWarning(uint256 timestamp, uint256 age);
    
    /**
     * @dev Constructor to set the Chainlink data feed address and metadata
     * @param _dataFeed Address of the Chainlink aggregator contract
     * @param _asset The asset symbol (e.g. "BTC", "ETH", "LINK")
     * @param _currency The currency symbol (e.g. "USD")
     * @param _heartbeat Maximum expected time between price updates (in seconds)
     */
    constructor(
        address _dataFeed, 
        string memory _asset, 
        string memory _currency,
        uint256 _heartbeat
    ) {
        require(_dataFeed != address(0), "Invalid data feed address");
        require(_heartbeat > 0, "Heartbeat must be positive");
        
        dataFeed = IAggregatorV3(_dataFeed);
        asset = _asset;
        currency = _currency;
        heartbeat = _heartbeat;
        decimals = dataFeed.decimals();
    }
    
    /**
     * @dev Get the latest price value from Chainlink with staleness checking
     * @return value The latest price value
     */
    function getLatestValue() external view returns (int256) {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = dataFeed.latestRoundData();
        
        require(answer > 0, "Invalid price data");
        require(updatedAt > 0, "Price not updated");
        require(roundId == answeredInRound, "Stale price data");
        
        // Check data freshness
        uint256 age = block.timestamp - updatedAt;
        require(age <= heartbeat, "Price data is stale");
        
        return answer;
    }
    
    /**
     * @dev Get the latest value with custom staleness requirement
     * @param _maxAge Maximum age in seconds for the data to be considered fresh
     * @return value The latest price value
     * @return timestamp The timestamp of the retrieved value
     */
    function getLatestValueWithAge(uint256 _maxAge) external view returns (int256 value, uint256 timestamp) {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = dataFeed.latestRoundData();
        
        require(answer > 0, "Invalid price data");
        require(updatedAt > 0, "Price not updated");
        require(roundId == answeredInRound, "Stale price data");
        
        // Check custom age requirement
        uint256 age = block.timestamp - updatedAt;
        require(age <= _maxAge, "Data exceeds maximum age");
        
        return (answer, updatedAt);
    }
    
    /**
     * @dev Get historical round data by round ID
     * @param _roundId The specific round ID to retrieve
     * @return value The price value at that round
     * @return timestamp The timestamp of that round
     * @return startedAt When the round started
     */
    function getRoundData(uint80 _roundId) external view returns (
        int256 value,
        uint256 timestamp,
        uint256 startedAt
    ) {
        (
            uint80 roundId,
            int256 answer,
            uint256 roundStartedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = dataFeed.getRoundData(_roundId);
        
        require(answer > 0, "Invalid price data for round");
        require(updatedAt > 0, "Round not updated");
        require(roundId == answeredInRound, "Incomplete round data");
        
        return (answer, updatedAt, roundStartedAt);
    }
    
    /**
     * @dev Get multiple recent values by fetching recent rounds
     * @param _roundsBack Number of rounds to look back
     * @return values Array of recent price values
     * @return timestamps Array of corresponding timestamps
     * @return roundIds Array of corresponding round IDs
     */
    function getRecentValues(uint256 _roundsBack) external view returns (
        int256[] memory values,
        uint256[] memory timestamps,
        uint80[] memory roundIds
    ) {
        require(_roundsBack > 0, "Must request at least 1 round");
        require(_roundsBack <= 100, "Too many rounds requested"); // Prevent gas issues
        
        // Get latest round info first
        (uint80 latestRoundId,,,,) = dataFeed.latestRoundData();
        
        values = new int256[](_roundsBack);
        timestamps = new uint256[](_roundsBack);
        roundIds = new uint80[](_roundsBack);
        
        uint256 validRounds = 0;
        
        for (uint256 i = 0; i < _roundsBack; i++) {
            if (latestRoundId < i) break; // Prevent underflow
            
            uint80 targetRoundId = latestRoundId - uint80(i);
            
            try dataFeed.getRoundData(targetRoundId) returns (
                uint80 roundId,
                int256 answer,
                uint256 startedAt,
                uint256 updatedAt,
                uint80 answeredInRound
            ) {
                if (answer > 0 && updatedAt > 0 && roundId == answeredInRound) {
                    values[validRounds] = answer;
                    timestamps[validRounds] = updatedAt;
                    roundIds[validRounds] = roundId;
                    validRounds++;
                }
            } catch {
                // Skip invalid rounds
                continue;
            }
        }
        
        // Resize arrays to actual valid rounds
        assembly {
            mstore(values, validRounds)
            mstore(timestamps, validRounds)
            mstore(roundIds, validRounds)
        }
        
        return (values, timestamps, roundIds);
    }
    
    /**
     * @dev Fallback method to maintain compatibility with the PriceAggregator interface
     */
    function retrieveData() external view returns (uint256) {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = dataFeed.latestRoundData();
        
        // Return 0 for invalid data instead of reverting for compatibility
        if (answer <= 0 || updatedAt == 0 || roundId != answeredInRound) {
            return 0;
        }
        
        // Check staleness with heartbeat
        uint256 age = block.timestamp - updatedAt;
        if (age > heartbeat) {
            return 0;
        }
        
        return uint256(answer);
    }
    
    /**
     * @dev Get the timestamp of the last Chainlink update
     * @return The timestamp of the last price update
     */
    function getLastUpdateTimestamp() external view returns (uint256) {
        (,,, uint256 updatedAt,) = dataFeed.latestRoundData();
        return updatedAt;
    }
    
    /**
     * @dev Get the latest round ID
     * @return roundId The latest round ID
     */
    function getLatestRoundId() external view returns (uint80) {
        (uint80 roundId,,,,) = dataFeed.latestRoundData();
        return roundId;
    }
    
    /**
     * @dev Get comprehensive round information
     * @return roundId The latest round ID
     * @return answer The latest price
     * @return startedAt When the round started
     * @return updatedAt When the round was last updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function getLatestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return dataFeed.latestRoundData();
    }
    
    /**
     * @dev Check if the latest data is stale based on heartbeat
     * @return isStale Whether the data is considered stale
     * @return age The age of the data in seconds
     */
    function isDataStale() external view returns (bool isStale, uint256 age) {
        (,,, uint256 updatedAt,) = dataFeed.latestRoundData();
        
        if (updatedAt == 0) {
            return (true, type(uint256).max);
        }
        
        age = block.timestamp - updatedAt;
        isStale = age > heartbeat;
        
        return (isStale, age);
    }
    
    /**
     * @dev Check if the latest data is stale based on custom threshold
     * @param _maxAge Custom staleness threshold in seconds
     * @return isStale Whether the data exceeds the custom threshold
     * @return age The age of the data in seconds
     */
    function isDataStaleCustom(uint256 _maxAge) external view returns (bool isStale, uint256 age) {
        (,,, uint256 updatedAt,) = dataFeed.latestRoundData();
        
        if (updatedAt == 0) {
            return (true, type(uint256).max);
        }
        
        age = block.timestamp - updatedAt;
        isStale = age > _maxAge;
        
        return (isStale, age);
    }
    
    /**
     * @dev Get the data feed description from Chainlink
     * @return description The description of the price feed
     */
    function getDescription() external view returns (string memory) {
        return dataFeed.description();
    }
    
    /**
     * @dev Get the data feed version from Chainlink
     * @return version The version of the aggregator
     */
    function getVersion() external view returns (uint256) {
        return dataFeed.version();
    }
    
    /**
     * @dev Get the number of decimals for this price feed
     * @return The number of decimals
     */
    function getDecimals() external view returns (uint8) {
        return decimals;
    }
    
    /**
     * @dev Get the configured heartbeat for this adapter
     * @return The heartbeat in seconds
     */
    function getHeartbeat() external view returns (uint256) {
        return heartbeat;
    }
    
    /**
     * @dev Get comprehensive adapter information
     * @return assetSymbol The asset symbol (e.g., "BTC")
     * @return currencySymbol The currency symbol (e.g., "USD")
     * @return feedAddress The Chainlink data feed address
     * @return feedDecimals The decimals of the price feed
     * @return feedHeartbeat The heartbeat interval in seconds
     * @return feedDescription The description from Chainlink
     */
    function getAdapterInfo() external view returns (
        string memory assetSymbol,
        string memory currencySymbol,
        address feedAddress,
        uint8 feedDecimals,
        uint256 feedHeartbeat,
        string memory feedDescription
    ) {
        return (
            asset,
            currency,
            address(dataFeed),
            decimals,
            heartbeat,
            dataFeed.description()
        );
    }
    
    /**
     * @dev Emit price retrieved event (non-view function for event emission)
     * @param value The price value
     * @param timestamp The timestamp
     * @param roundId The round ID
     */
    function emitPriceRetrieved(int256 value, uint256 timestamp, uint80 roundId) external {
        emit PriceRetrieved(value, timestamp, roundId);
    }
    
    /**
     * @dev Emit stale data warning event (non-view function for event emission)
     * @param timestamp The timestamp
     * @param age The age of the data
     */
    function emitStaleDataWarning(uint256 timestamp, uint256 age) external {
        emit StaleDataWarning(timestamp, age);
    }
}