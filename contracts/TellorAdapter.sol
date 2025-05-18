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
     * @dev Get the latest price value from Tellor
     * @return value The latest price value in USD
     */
    function getLatestValue() external view returns (int256) {
        // Get data before current time (using current implementation)
        (bytes memory _value, uint256 _timestampRetrieved) = 
            _getDataBefore(queryId, block.timestamp);
        
        // Check if data exists and is fresh
        if (_timestampRetrieved == 0) return 0;
        require(block.timestamp - _timestampRetrieved < 24 hours, "Data is stale");
        
        // Decode and return the value
        uint256 decodedValue = abi.decode(_value, (uint256));
        return int256(decodedValue);
    }
    
    /**
     * @dev Fallback method to maintain compatibility with the interface
     */
    function retrieveData() external view returns (uint256) {
        (bytes memory _value, uint256 _timestampRetrieved) = 
            _getDataBefore(queryId, block.timestamp);
            
        if (_timestampRetrieved == 0) return 0;
        return abi.decode(_value, (uint256));
    }
    
    /**
     * @dev Get the timestamp of the last Tellor update
     * @return The timestamp of the last value
     */
    function getLastUpdateTimestamp() external view returns (uint256) {
        (, uint256 _timestampRetrieved) = _getDataBefore(queryId, block.timestamp);
        return _timestampRetrieved;
    }
}
