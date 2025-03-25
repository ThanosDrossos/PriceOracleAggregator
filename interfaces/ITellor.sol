// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITellor {
    function getCurrentValue(bytes32 _requestId) external view returns (uint256, uint256);
    function getTimestampbyRequestID(bytes32 _requestId) external view returns (uint256);
    function getRequestIdByIndex(uint256 _index) external view returns (bytes32);
    function getLatestData(bytes32 _requestId) external view returns (uint256, uint256, uint256);
    function getDataBefore(bytes32 _requestId, uint256 _timestamp) external view returns (uint256, uint256);
}