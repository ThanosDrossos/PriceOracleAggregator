// TellorMock.sol
// This file provides a mock implementation of the Tellor oracle for testing purposes.

pragma solidity ^0.8.0;

import "../interfaces/ITellor.sol";

contract TellorMock is ITellor {
    mapping(bytes32 => uint256) private data;
    mapping(bytes32 => uint256) private timestamps;

    function submitValue(bytes32 _queryId, uint256 _value) external {
        data[_queryId] = _value;
        timestamps[_queryId] = block.timestamp;
    }

    function getLatestValue(bytes32 _queryId) external view override returns (uint256, uint256) {
        return (data[_queryId], timestamps[_queryId]);
    }

    function getValueByTimestamp(bytes32 _queryId, uint256 _timestamp) external view override returns (uint256, uint256) {
        require(timestamps[_queryId] <= _timestamp, "No value available for this timestamp");
        return (data[_queryId], timestamps[_queryId]);
    }

    function getCurrentValue(bytes32 _queryId) external view override returns (uint256) {
        return data[_queryId];
    }
}