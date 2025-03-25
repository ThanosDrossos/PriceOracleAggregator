pragma solidity ^0.8.0;

import "../interfaces/IAPI3.sol";

// Simplified mock that only implements required functions
contract API3Mock is IAPI3 {
    int256 private _price;
    
    constructor(int256 initialPrice) {
        _price = initialPrice;
    }
    
    function setLatestPrice(int256 price) external {
        _price = price;
    }
    
    function getLatestPrice() external view returns (int256) {
        return _price;
    }
    
    // Changed from pure to view since it reads state (_price) and block.timestamp
    function getDataBefore(bytes32 _dataFeedId, uint256 timestamp) external view returns (int224 value, uint32 timestampValue) {
        return (int224(_price), uint32(block.timestamp - 3600));
    }
    
    function read(bytes32 _dataFeedId) external view returns (int224 value, uint32 timestamp) {
        return (int224(_price), uint32(block.timestamp));
    }
}