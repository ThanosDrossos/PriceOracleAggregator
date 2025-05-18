// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITellorOld {
    // Simplified interface for our use case
    function getLatestValue() external view returns (int256);
    
    // Additional functions if needed
    function getCurrentValue(bytes32 _queryId) external view returns (uint256);
    
    // Added method for setting active query ID
    function setActiveQueryId(bytes32 queryId) external;
}