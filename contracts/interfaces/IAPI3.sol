// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAPI3 {
    function getLatestPrice() external view returns (int256);
    
    // Fix parameter name conflict - rename return parameter
    function getDataBefore(bytes32 _dataFeedId, uint256 timestamp) external view returns (int224 value, uint32 timestampValue);
    function read(bytes32 _dataFeedId) external view returns (int224 value, uint32 timestamp);
}