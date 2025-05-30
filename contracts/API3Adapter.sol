// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// API3 Reader Proxy interface
interface IApi3ReaderProxy {
    function read() external view returns (int224 value, uint32 timestamp);
}

/**
 * @title API3Adapter
 * @dev Adapter contract that standardizes the API3 oracle interface for our PriceAggregator
 * Uses API3 Reader Proxy contracts to fetch price data
 */
contract API3Adapter {
    
    IApi3ReaderProxy public immutable dataFeed;
    string public asset;
    string public currency;
    uint256 public immutable heartbeat;
    uint8 public immutable decimals;
    
    // Events for better tracking
    event PriceRetrieved(int224 value, uint32 timestamp);
    event StaleDataWarning(uint32 timestamp, uint256 age);
    
    /**
     * @dev Constructor to set the API3 Reader Proxy address and metadata
     * @param _dataFeed Address of the API3 Reader Proxy contract
     * @param _asset The asset symbol (e.g. "BTC", "ETH")
     * @param _currency The currency symbol (e.g. "USD")
     * @param _heartbeat Maximum expected time between price updates (in seconds)
     * @param _decimals Number of decimal places for the price feed
     */
    constructor(
        address _dataFeed,
        string memory _asset,
        string memory _currency,
        uint256 _heartbeat,
        uint8 _decimals
    ) {
        require(_dataFeed != address(0), "Invalid data feed address");
        require(_heartbeat > 0, "Heartbeat must be positive");
        require(_decimals > 0, "Decimals must be positive");
        
        dataFeed = IApi3ReaderProxy(_dataFeed);
        asset = _asset;
        currency = _currency;
        heartbeat = _heartbeat;
        decimals = _decimals;
    }
    
    /**
     * @dev Get the latest price value from API3 with staleness checking
     * @return value The latest price value
     */
    function getLatestValue() external view returns (int256) {
        (int224 answer, uint32 updatedAt) = dataFeed.read();
        
        require(answer > 0, "Invalid price data");
        require(updatedAt > 0, "Price not updated");
        
        // Check data freshness
        uint256 age = block.timestamp - uint256(updatedAt);
        require(age <= heartbeat, "Price data is stale");
        
        return int256(answer);
    }
    
    /**
     * @dev Get the latest value with custom staleness requirement
     * @param _maxAge Maximum age in seconds for the data to be considered fresh
     * @return value The latest price value
     * @return timestamp The timestamp of the retrieved value
     */
    function getLatestValueWithAge(uint256 _maxAge) external view returns (int256 value, uint256 timestamp) {
        (int224 answer, uint32 updatedAt) = dataFeed.read();
        
        require(answer > 0, "Invalid price data");
        require(updatedAt > 0, "Price not updated");
        
        // Check custom age requirement
        uint256 age = block.timestamp - uint256(updatedAt);
        require(age <= _maxAge, "Data exceeds maximum age");
        
        return (int256(answer), uint256(updatedAt));
    }
    
    /**
     * @dev Get multiple recent values - Note: API3 doesn't provide historical data
     * This method returns the current value multiple times for compatibility
     * @param _count Number of values requested (will return current value _count times)
     * @return values Array of current price value repeated _count times
     * @return timestamps Array of current timestamp repeated _count times
     */
    function getRecentValues(uint256 _count) external view returns (
        int256[] memory values,
        uint256[] memory timestamps
    ) {
        require(_count > 0, "Must request at least 1 value");
        require(_count <= 100, "Too many values requested"); // Prevent gas issues
        
        (int224 currentValue, uint32 currentTimestamp) = dataFeed.read();
        require(currentValue > 0, "Invalid current price data");
        require(currentTimestamp > 0, "Current price not updated");
        
        values = new int256[](_count);
        timestamps = new uint256[](_count);
        
        // Fill arrays with current data (API3 doesn't provide historical rounds)
        for (uint256 i = 0; i < _count; i++) {
            values[i] = int256(currentValue);
            timestamps[i] = uint256(currentTimestamp);
        }
        
        return (values, timestamps);
    }
    
    /**
     * @dev Fallback method to maintain compatibility with the PriceAggregator interface
     */
    function retrieveData() external view returns (uint256) {
        (int224 answer, uint32 updatedAt) = dataFeed.read();
        
        // Return 0 for invalid data instead of reverting for compatibility
        if (answer <= 0 || updatedAt == 0) {
            return 0;
        }
        
        // Check staleness with heartbeat
        uint256 age = block.timestamp - uint256(updatedAt);
        if (age > heartbeat) {
            return 0;
        }
        
        return uint256(int256(answer));
    }
    
    /**
     * @dev Get the timestamp of the last API3 update
     * @return The timestamp of the last price update
     */
    function getLastUpdateTimestamp() external view returns (uint256) {
        (, uint32 updatedAt) = dataFeed.read();
        return uint256(updatedAt);
    }
    
    /**
     * @dev Get comprehensive price information
     * @return value The latest price
     * @return timestamp When the price was last updated
     */
    function getLatestData() external view returns (int224 value, uint32 timestamp) {
        return dataFeed.read();
    }
    
    /**
     * @dev Check if the latest data is stale based on heartbeat
     * @return isStale Whether the data is considered stale
     * @return age The age of the data in seconds
     */
    function isDataStale() external view returns (bool isStale, uint256 age) {
        (, uint32 updatedAt) = dataFeed.read();
        
        if (updatedAt == 0) {
            return (true, type(uint256).max);
        }
        
        age = block.timestamp - uint256(updatedAt);
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
        (, uint32 updatedAt) = dataFeed.read();
        
        if (updatedAt == 0) {
            return (true, type(uint256).max);
        }
        
        age = block.timestamp - uint256(updatedAt);
        isStale = age > _maxAge;
        
        return (isStale, age);
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
     * @return feedAddress The API3 Reader Proxy address
     * @return feedDecimals The decimals of the price feed
     * @return feedHeartbeat The heartbeat interval in seconds
     */
    function getAdapterInfo() external view returns (
        string memory assetSymbol,
        string memory currencySymbol,
        address feedAddress,
        uint8 feedDecimals,
        uint256 feedHeartbeat
    ) {
        return (
            asset,
            currency,
            address(dataFeed),
            decimals,
            heartbeat
        );
    }
    
    /**
     * @dev Get the description for this adapter
     * @return description A descriptive string of the price feed
     */
    function getDescription() external view returns (string memory) {
        return string(abi.encodePacked(asset, " / ", currency));
    }
    
    /**
     * @dev Emit price retrieved event (non-view function for event emission)
     * @param value The price value
     * @param timestamp The timestamp
     */
    function emitPriceRetrieved(int224 value, uint32 timestamp) external {
        emit PriceRetrieved(value, timestamp);
    }
    
    /**
     * @dev Emit stale data warning event (non-view function for event emission)
     * @param timestamp The timestamp
     * @param age The age of the data
     */
    function emitStaleDataWarning(uint32 timestamp, uint256 age) external {
        emit StaleDataWarning(timestamp, age);
    }
    
    /**
     * @dev Check if the adapter can provide price data
     * @return canProvide Whether the adapter can provide data
     */
    function canProvideData() external view returns (bool canProvide) {
        try dataFeed.read() returns (int224 value, uint32 timestamp) {
            canProvide = (value > 0 && timestamp > 0);
        } catch {
            canProvide = false;
        }
    }
    
    /**
     * @dev Get data feed address
     * @return The address of the API3 Reader Proxy
     */
    function getDataFeedAddress() external view returns (address) {
        return address(dataFeed);
    }
}