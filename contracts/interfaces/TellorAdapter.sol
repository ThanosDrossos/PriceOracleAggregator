// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ITellor.sol";

/**
 * @title TellorAdapter
 * @dev Adapter contract that standardizes the Tellor oracle interface for our PriceAggregator
 */
contract TellorAdapter {
    address public immutable tellorAddress;
    bytes32 public immutable queryId;
    uint256 public immutable queryType;
    
    /**
     * @dev Constructor to set the Tellor oracle address and queryId
     * @param _tellor Address of the Tellor oracle contract
     * @param _queryId The bytes32 identifier for the price feed (ETH-USD)
     * @param _queryType The type of query (typically 2 for price feeds)
     */
    constructor(address _tellor, bytes32 _queryId, uint256 _queryType) {
        tellorAddress = _tellor;
        queryId = _queryId;
        queryType = _queryType;
    }
    
    /**
     * @dev Get the latest price value from Tellor
     * @return value The latest price value
     */
    function getLatestValue() external view returns (int256) {
        // Get the most recent value from Tellor for the specified queryId
        (bool success, bytes memory data) = tellorAddress.staticcall(
            abi.encodeWithSignature("retrieveData(bytes32,uint256)", queryId, 0)
        );
        
        require(success, "Tellor data retrieval failed");
        
        // Decode the response and convert to int256
        uint256 value = abi.decode(data, (uint256));
        require(value > 0, "Invalid Tellor value");
        
        return int256(value);
    }
    
    /**
     * @dev Get the timestamp of the last Tellor update
     * @return The timestamp of the last value
     */
    function getTimestampByQueryIdAndIndex(bytes32 _queryId, uint256 _index) external view returns (uint256) {
        (bool success, bytes memory data) = tellorAddress.staticcall(
            abi.encodeWithSignature("getTimestampbyQueryIdandIndex(bytes32,uint256)", _queryId, _index)
        );
        
        require(success, "Tellor timestamp retrieval failed");
        
        return abi.decode(data, (uint256));
    }
}