// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IAPI3.sol";

/**
 * @title API3Adapter
 * @dev Adapter for API3 oracles, providing a standardized interface for the PriceAggregator
 */
contract API3Adapter {
    address public immutable api3ProxyAddress;
    bytes32 public immutable dataFeedId;
    
    /**
     * @dev Constructor sets the API3 proxy address and dataFeedId
     * @param _api3ProxyAddress The API3 proxy contract address on Sepolia
     * @param _dataFeedId The API3 data feed ID for the price pair
     */
    constructor(address _api3ProxyAddress, bytes32 _dataFeedId) {
        require(_api3ProxyAddress != address(0), "Invalid proxy address");
        api3ProxyAddress = _api3ProxyAddress;
        dataFeedId = _dataFeedId;
    }
    
    /**
     * @dev Returns the latest price from the API3 oracle
     * @return price The latest price scaled to 18 decimals
     */
    function getLatestPrice() external view returns (int256) {
        // Call API3's read function
        (int224 value, uint32 timestamp) = IAPI3(api3ProxyAddress).read(dataFeedId);
        
        // Verify the timestamp is recent enough (within the last day)
        require(block.timestamp - timestamp <= 1 days, "API3 data is stale");
        
        // Convert to int256 and return
        return int256(value);
    }
    
    /**
     * @dev Returns the timestamp of the latest update
     * @return timestamp when the price was last updated
     */
    function getLastUpdateTimestamp() external view returns (uint256) {
        (, uint32 timestamp) = IAPI3(api3ProxyAddress).read(dataFeedId);
        return timestamp;
    }
}