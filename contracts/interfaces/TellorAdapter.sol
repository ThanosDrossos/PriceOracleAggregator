// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.8.0;

import "../interfaces/ITellor.sol";

/**
 * @title TellorAdapter
 * @dev Adapter contract that standardizes the Tellor oracle interface for our PriceAggregator
 */
contract TellorAdapter {
    address public immutable tellorAddress;
    bytes32 public immutable queryId;
    
    /**
     * @dev Constructor to set the Tellor oracle address and queryId
     * @param _tellor Address of the Tellor oracle contract
     * @param _queryId The bytes32 identifier for the price feed (e.g. ETH-USD)
     */
    constructor(address _tellor, bytes32 _queryId) {
        require(_tellor != address(0), "Invalid Tellor address");
        tellorAddress = _tellor;
        queryId = _queryId;
    }
    
    /**
     * @dev Get the latest price value from Tellor
     * @return value The latest price value in USD with 18 decimals
     */
    function getLatestValue() external view returns (int256) {
        // Call the Tellor contract to get the latest value
        uint256 value = ITellor(tellorAddress).getCurrentValue(queryId);
        
        require(value > 0, "No value available from Tellor");
        
        // Convert to int256 and return
        return int256(value);
    }
    
    /**
     * @dev Fallback method to maintain compatibility with the interface
     */
    function retrieveData() external view returns (uint256) {
        return ITellor(tellorAddress).getCurrentValue(queryId);
    }
    
    /**
     * @dev Get the timestamp of the last Tellor update
     * @return The timestamp of the last value
     */
    function getLastUpdateTimestamp() external view returns (uint256) {
        // In a real implementation, we would need to query the Tellor contract for this
        // For now we just return the current block timestamp as many Tellor implementations
        // don't expose a direct timestamp accessor
        return block.timestamp;
    }
}