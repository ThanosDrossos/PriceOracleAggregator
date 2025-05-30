// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "usingtellor/contracts/UsingTellor.sol";

/**
 * @title TellorAdapter
 * @dev Adapter contract that standardizes the Tellor oracle interface for our PriceAggregator
 */
contract TellorAdapter is UsingTellor {
    bytes32 public immutable queryId;
    string public asset;
    string public currency;
    
    // Events for better tracking
    event PriceRetrieved(uint256 value, uint256 timestamp);
    event StaleDataWarning(uint256 timestamp, uint256 age);
    event DecodingError(bytes data, string reason);
    
    /**
     * @dev Constructor to set the Tellor oracle address and query parameters
     * @param _tellor Address of the Tellor oracle contract
     * @param _asset The asset symbol (e.g. "btc")
     * @param _currency The currency symbol (e.g. "usd")
     */
    constructor(address _tellor, string memory _asset, string memory _currency) UsingTellor(payable(_tellor)) {
        require(_tellor != address(0), "Invalid Tellor address");
        asset = _asset;
        currency = _currency;
        
        // Generate the queryId using the standard Tellor format
        bytes memory _queryData = abi.encode("SpotPrice", abi.encode(_asset, _currency));
        queryId = keccak256(_queryData);
    }
    
    /**
     * @dev Safely decode Tellor data with simple fallback approach
     * @param _data The raw bytes data from Tellor
     * @return success Whether decoding was successful
     * @return value The decoded value (0 if unsuccessful)
     */
    function _safeDecodeData(bytes memory _data) private pure returns (bool success, uint256 value) {
        if (_data.length == 0) {
            return (false, 0);
        }
        
        if (_data.length == 32) {
            // Simple uint256 decoding
            uint256 result = abi.decode(_data, (uint256));
            if (result > 0) {
                return (true, result);
            }
            
            // If uint256 failed or returned 0, try int256
            int256 signedResult = abi.decode(_data, (int256));
            if (signedResult > 0) {
                return (true, uint256(signedResult));
            }
        }
        
        return (false, 0);
    }
    
    /**
     * @dev Helper function to try decoding as uint256
     */
    function _tryDecodeUint256(bytes memory _data) external pure returns (uint256) {
        return abi.decode(_data, (uint256));
    }
    
    /**
     * @dev Helper function to try decoding as int256
     */
    function _tryDecodeInt256(bytes memory _data) external pure returns (int256) {
        return abi.decode(_data, (int256));
    }
    
    /**
     * @dev Helper function to try decoding as bytes32
     */
    function _tryDecodeBytes32(bytes memory _data) external pure returns (bytes32) {
        return abi.decode(_data, (bytes32));
    }
    
    /**
     * @dev Get the latest price value from Tellor with dispute checking
     * @return value The latest price value in USD
     */
    function getLatestValue() external view returns (int256) {
        (bytes memory _value, uint256 _timestampRetrieved) = 
            _getDataBefore(queryId, block.timestamp);
        
        // Check if data exists
        if (_timestampRetrieved == 0) return 0;
        
        // Check if data is in dispute
        if (_isInDispute(queryId, _timestampRetrieved)) return 0;
        
        // Safely decode and return the value
        (bool success, uint256 decodedValue) = _safeDecodeData(_value);
        return success ? int256(decodedValue) : int256(0);
    }
    
    /**
     * @dev Get the age of the latest data in seconds
     * @return age The age of the latest data in seconds (0 if no data)
     */
    function getDataAge() external view returns (uint256) {
        (, uint256 _timestampRetrieved) = _getDataBefore(queryId, block.timestamp);
        
        if (_timestampRetrieved == 0) return 0;
        
        return block.timestamp - _timestampRetrieved;
    }
    
    /**
     * @dev Get the latest value along with its age and status
     * @return value The latest price value
     * @return timestamp The timestamp of the data
     * @return age The age of the data in seconds
     * @return disputed Whether the data is disputed
     */
    function getLatestValueWithStatus() external view returns (
        int256 value, 
        uint256 timestamp, 
        uint256 age, 
        bool disputed
    ) {
        (bytes memory _value, uint256 _timestampRetrieved) = 
            _getDataBefore(queryId, block.timestamp);
        
        if (_timestampRetrieved == 0) {
            return (0, 0, 0, false);
        }
        
        bool isDataDisputed = _isInDispute(queryId, _timestampRetrieved);
        uint256 dataAge = block.timestamp - _timestampRetrieved;
        
        if (isDataDisputed) {
            return (0, _timestampRetrieved, dataAge, true);
        }
        
        (bool success, uint256 decodedValue) = _safeDecodeData(_value);
        int256 finalValue = success ? int256(decodedValue) : int256(0);
        
        return (finalValue, _timestampRetrieved, dataAge, false);
    }
    
    /**
     * @dev Get the latest value with custom freshness requirement
     * @param _maxAge Maximum age in seconds for the data to be considered fresh
     * @return value The latest price value
     * @return timestamp The timestamp of the retrieved value
     */
    function getLatestValueWithAge(uint256 _maxAge) external view returns (int256 value, uint256 timestamp) {
        (bytes memory _value, uint256 _timestampRetrieved) = 
            _getDataBefore(queryId, block.timestamp);
        
        if (_timestampRetrieved == 0) return (0, 0);
        
        // Check if data is in dispute
        if (_isInDispute(queryId, _timestampRetrieved)) return (0, 0);
        
        // Check custom age requirement
        if (block.timestamp - _timestampRetrieved >= _maxAge) return (0, 0);
        
        (bool success, uint256 decodedValue) = _safeDecodeData(_value);
        return success ? (int256(decodedValue), _timestampRetrieved) : (int256(0), 0);
    }
    
    /**
     * @dev Get multiple recent values for better price analysis
     * @param _maxAge Maximum age in seconds to look back
     * @param _maxCount Maximum number of values to return
     * @return values Array of price values
     * @return timestamps Array of corresponding timestamps
     */
    function getMultipleValues(uint256 _maxAge, uint256 _maxCount) 
        external 
        view 
        returns (uint256[] memory values, uint256[] memory timestamps) 
    {
        (bytes[] memory _values, uint256[] memory _timestamps) = 
            _getMultipleValuesBefore(queryId, block.timestamp, _maxAge, _maxCount);
        
        values = new uint256[](_values.length);
        timestamps = _timestamps;
        
        for (uint256 i = 0; i < _values.length; i++) {
            // Skip disputed values
            if (!_isInDispute(queryId, _timestamps[i])) {
                values[i] = abi.decode(_values[i], (uint256));
            }
        }
        
        return (values, timestamps);
    }
    
    /**
     * @dev Get value at a specific timestamp
     * @param _timestamp The specific timestamp to retrieve data for
     * @return value The price value at that timestamp
     */
    function getValueAtTimestamp(uint256 _timestamp) external view returns (uint256) {
        require(_timestamp <= block.timestamp, "Cannot query future timestamp");
        
        bytes memory _value = _retrieveData(queryId, _timestamp);
        require(_value.length > 0, "No data found at timestamp");
        
        // Check if this specific data point is disputed
        require(!_isInDispute(queryId, _timestamp), "Data at timestamp is disputed");
        
        return abi.decode(_value, (uint256));
    }
    
    /**
     * @dev Get the next value after a specific timestamp
     * @param _timestamp The timestamp after which to search
     * @return value The next available price value
     * @return timestampRetrieved The timestamp of the retrieved value
     */
    function getValueAfter(uint256 _timestamp) external view returns (uint256 value, uint256 timestampRetrieved) {
        (bytes memory _value, uint256 _timestampRetrieved) = 
            _getDataAfter(queryId, _timestamp);
        
        if (_timestampRetrieved == 0) return (0, 0);
        
        // Check if data is in dispute
        require(!_isInDispute(queryId, _timestampRetrieved), "Data is under dispute");
        
        uint256 decodedValue = abi.decode(_value, (uint256));
        return (decodedValue, _timestampRetrieved);
    }
    
    /**
     * @dev Fallback method to maintain compatibility with the interface
     */
    function retrieveData() external view returns (uint256) {
        (bytes memory _value, uint256 _timestampRetrieved) = 
            _getDataBefore(queryId, block.timestamp);
            
        if (_timestampRetrieved == 0) return 0;
        
        // Don't return disputed data
        if (_isInDispute(queryId, _timestampRetrieved)) return 0;
        
        (bool success, uint256 decodedValue) = _safeDecodeData(_value);
        return success ? decodedValue : 0;
    }
    
    /**
     * @dev Get the timestamp of the last Tellor update
     * @return The timestamp of the last value
     */
    function getLastUpdateTimestamp() external view returns (uint256) {
        (, uint256 _timestampRetrieved) = _getDataBefore(queryId, block.timestamp);
        return _timestampRetrieved;
    }
    
    /**
     * @dev Get the total number of values submitted for this query
     * @return count The total number of values
     */
    function getValueCount() external view returns (uint256) {
        return _getNewValueCountbyQueryId(queryId);
    }
    
    /**
     * @dev Get the reporter address for a specific timestamp
     * @param _timestamp The timestamp to query
     * @return reporter The address of the reporter
     */
    function getReporter(uint256 _timestamp) external view returns (address) {
        return _getReporterByTimestamp(queryId, _timestamp);
    }
    
    /**
     * @dev Check if data at a specific timestamp is disputed
     * @param _timestamp The timestamp to check
     * @return disputed Whether the data is under dispute
     */
    function isDisputed(uint256 _timestamp) external view returns (bool) {
        return _isInDispute(queryId, _timestamp);
    }
    
    /**
     * @dev Get timestamp by index
     * @param _index The index to query
     * @return timestamp The timestamp at that index
     */
    function getTimestampByIndex(uint256 _index) external view returns (uint256) {
        return _getTimestampbyQueryIdandIndex(queryId, _index);
    }
    
    /**
     * @dev Get the index for data before a specific timestamp
     * @param _timestamp The timestamp to search before
     * @return found Whether an index was found
     * @return index The index found
     */
    function getIndexBefore(uint256 _timestamp) external view returns (bool found, uint256 index) {
        return _getIndexForDataBefore(queryId, _timestamp);
    }
    
    /**
     * @dev Get the index for data after a specific timestamp
     * @param _timestamp The timestamp to search after
     * @return found Whether an index was found
     * @return index The index found
     */
    function getIndexAfter(uint256 _timestamp) external view returns (bool found, uint256 index) {
        return _getIndexForDataAfter(queryId, _timestamp);
    }
}
