pragma solidity ^0.8.0;

interface ITellor {
    // Simplified interface for our use case
    function getLatestValue() external view returns (int256);
    
    // Additional functions if needed
    function getCurrentValue(bytes32 _queryId) external view returns (uint256);
}