// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IAPI3.sol";

/**
 * @title API3Mock
 * @dev Mock implementation of the API3 price feed interface
 * Accurately mimics the behavior of API3 oracles on Sepolia
 */
contract API3Mock is IAPI3 {
    mapping(bytes32 => DataFeed) private dataFeeds;
    int224 private _latestValue;
    uint32 private _timestamp;
    
    struct DataFeed {
        int224 value;
        uint32 timestamp;
    }
    
    // Default data feed ID for tests
    bytes32 public constant DEFAULT_DATA_FEED_ID = 0x4385954e058fbe6b6a744f32a4f89d67aad099f8fb8b23e7ea8dd366ae88151d;
    
    constructor(int256 initialValue) {
        _latestValue = int224(initialValue);
        _timestamp = uint32(block.timestamp);
        
        // Initialize with the default data feed
        dataFeeds[DEFAULT_DATA_FEED_ID] = DataFeed({
            value: int224(initialValue),
            timestamp: uint32(block.timestamp)
        });
    }
    
    /**
     * @notice Sets a new price value
     * @param value The new price value
     */
    function setLatestPrice(int256 value) external {
        _latestValue = int224(value);
        _timestamp = uint32(block.timestamp);
        
        // Also update the default data feed
        dataFeeds[DEFAULT_DATA_FEED_ID].value = int224(value);
        dataFeeds[DEFAULT_DATA_FEED_ID].timestamp = uint32(block.timestamp);
    }
    
    /**
     * @notice Sets a specific data feed value
     * @param dataFeedId The ID of the data feed to update
     * @param value The new price value
     * @param timestamp Optional timestamp (defaults to current block timestamp)
     */
    function setDataFeedValue(bytes32 dataFeedId, int224 value, uint32 timestamp) external {
        if (timestamp == 0) {
            timestamp = uint32(block.timestamp);
        }
        
        dataFeeds[dataFeedId] = DataFeed({
            value: value,
            timestamp: timestamp
        });
        
        // IMPORTANT FIX: Also update the _latestValue since getLatestPrice() is likely what's being called
        _latestValue = value;
        _timestamp = timestamp;
    }
    
    /**
     * @notice Sets the timestamp to test stale data scenarios
     * @param timestamp The timestamp to set
     */
    function setTimestamp(uint32 timestamp) external {
        require(timestamp <= block.timestamp, "Cannot set future timestamp");
        _timestamp = timestamp;
        dataFeeds[DEFAULT_DATA_FEED_ID].timestamp = timestamp;
    }
    
    /**
     * @notice Gets the latest price (legacy function)
     * @return The latest price value
     */
    function getLatestPrice() external view returns (int256) {
        return int256(_latestValue);
    }
    
    /**
     * @notice Gets data from before a specific timestamp
     * @param _dataFeedId The data feed ID to query
     * @param timestamp The timestamp to query data before
     * @return value The price value
     * @return timestampValue The timestamp of the value
     */
    function getDataBefore(bytes32 _dataFeedId, uint256 timestamp) external view returns (int224 value, uint32 timestampValue) {
        DataFeed memory feed = dataFeeds[_dataFeedId];
        require(feed.timestamp > 0, "No data available for this feed");
        
        if (feed.timestamp < timestamp) {
            return (feed.value, feed.timestamp);
        } else {
            // For mocking purposes, just return a slightly older timestamp
            return (feed.value, feed.timestamp - 3600);
        }
    }
    
    /**
     * @notice Reads the latest value for a data feed
     * @param _dataFeedId The data feed ID to read
     * @return value The latest price value
     * @return timestamp The timestamp of the value
     */
    function read(bytes32 _dataFeedId) external view returns (int224 value, uint32 timestamp) {
        DataFeed memory feed = dataFeeds[_dataFeedId];
        
        if (feed.timestamp > 0) {
            return (feed.value, feed.timestamp);
        } else {
            // Fallback to default values if this feed hasn't been set
            return (_latestValue, _timestamp);
        }
    }
}