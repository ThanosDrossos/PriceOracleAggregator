// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ITellor_old.sol";

/**
 * @title TellorMock
 * @dev Mock implementation of the Tellor oracle interface
 * Mimics the behavior of Tellor oracles on Sepolia
 */
contract TellorMock is ITellorOld {
    // Maps query IDs to values
    mapping(bytes32 => QueryData) private values;
    int256 private _defaultValue;
    uint256 private _lastReportedTimestamp;
    bytes32 private _activeQueryId;
    
    struct QueryData {
        uint256 value;
        uint256 timestamp;
        bool exists;
    }
    
    // Default query IDs for commonly used price feeds
    bytes32 public constant ETH_USD_QUERY_ID = 0x83a7f3d48786ac2667503a61e8c415438ed2922eb86a2906e4ee66d9a2ce4992;
    bytes32 public constant BTC_USD_QUERY_ID = 0xa6f013ee236804827b77696d350e9f0ac3e879328f2a3021d473a0b778ad78ac;
    bytes32 public constant LINK_USD_QUERY_ID = 0xc138a64c42a40eb5ba8f64de1e62884a0e4259d8c34872c5d5d52a8fa426d697;
    
    constructor(int256 initialValue) {
        _defaultValue = initialValue;
        _lastReportedTimestamp = block.timestamp;
        _activeQueryId = ETH_USD_QUERY_ID; // Default to ETH_USD
        
        // Initialize common query IDs
        uint256 uintValue = initialValue > 0 ? uint256(initialValue) : 0;
        values[ETH_USD_QUERY_ID] = QueryData({
            value: uintValue,
            timestamp: block.timestamp,
            exists: true
        });
        
        values[BTC_USD_QUERY_ID] = QueryData({
            value: uintValue * 20, // BTC is ~20x ETH price
            timestamp: block.timestamp,
            exists: true
        });
        
        values[LINK_USD_QUERY_ID] = QueryData({
            value: uintValue / 150, // LINK is ~1/150 of ETH price
            timestamp: block.timestamp,
            exists: true
        });
    }
    
    /**
     * @notice Sets the default value for the mock
     * @param value The new value to set
     */
    function setValue(int256 value) external {
        _defaultValue = value;
        _lastReportedTimestamp = block.timestamp;
        
        // Update common query IDs with the new value
        uint256 uintValue = value > 0 ? uint256(value) : 0;
        values[ETH_USD_QUERY_ID].value = uintValue;
        values[ETH_USD_QUERY_ID].timestamp = block.timestamp;
    }
    
    /**
     * @notice Sets the value for a specific query ID
     * @param queryId The query ID to set the value for
     * @param value The new value to set
     * @param timestamp Optional timestamp (defaults to current block timestamp)
     */
    function setValueForQueryId(bytes32 queryId, uint256 value, uint256 timestamp) external {
        if (timestamp == 0) {
            timestamp = block.timestamp;
        }
        
        values[queryId] = QueryData({
            value: value,
            timestamp: timestamp,
            exists: true
        });
        
        // IMPORTANT FIX: Also update the default value for getLatestValue()
        _defaultValue = int256(value);
        _lastReportedTimestamp = timestamp;
        _activeQueryId = queryId;
    }
    
    /**
     * @notice Sets the active query ID that getLatestValue() will return data for
     * @param queryId The query ID to make active
     */
    function setActiveQueryId(bytes32 queryId) external {
        _activeQueryId = queryId;
    }
    
    /**
     * @notice Gets the latest value (legacy function for compatibility)
     * @return The latest price value
     */
    function getLatestValue() external view override returns (int256) {
        // IMPORTANT FIX: Use the active query ID's value if it exists
        QueryData memory data = values[_activeQueryId];
        if (data.exists) {
            return int256(data.value);
        }
        return _defaultValue;
    }
    
    /**
     * @notice Gets the current value for a specific query ID
     * @param _queryId The query ID to get the value for
     * @return value The current value
     */
    function getCurrentValue(bytes32 _queryId) external view override returns (uint256) {
        QueryData memory data = values[_queryId];
        
        if (data.exists) {
            return data.value;
        } else {
            // If query ID doesn't exist, return the default value
            return _defaultValue > 0 ? uint256(_defaultValue) : 0;
        }
    }
    
    /**
     * @notice Gets the timestamp of the last reported value for a query ID
     * @param _queryId The query ID to check
     * @return timestamp The timestamp of the last report
     */
    function getTimestampByQueryIdandIndex(bytes32 _queryId, uint256) external view returns (uint256) {
        QueryData memory data = values[_queryId];
        return data.exists ? data.timestamp : _lastReportedTimestamp;
    }
    
    /**
     * @notice Gets the latest timestamp
     * @return timestamp when the latest value was reported
     */
    function getTimeOfLastNewValue() external view returns (uint256) {
        return _lastReportedTimestamp;
    }
}