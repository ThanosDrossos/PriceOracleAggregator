// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAPI3 {
    function getLatestData(bytes32 _jobId) external view returns (uint256, uint256);
    function getData(bytes32 _jobId) external view returns (uint256);
}