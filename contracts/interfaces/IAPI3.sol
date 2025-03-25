pragma solidity ^0.8.0;

interface IAPI3 {
    function getLatestPrice() external view returns (int256);
    
    // Optional methods if you want to implement them later
    function getDataBefore(bytes32 _dataFeedId, uint256 timestamp) external view returns (int224 value, uint32 timestamp);
    function read(bytes32 _dataFeedId) external view returns (int224 value, uint32 timestamp);
}