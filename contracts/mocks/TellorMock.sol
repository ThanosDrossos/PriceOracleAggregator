pragma solidity ^0.8.0;

import "../interfaces/ITellor.sol";

contract TellorMock is ITellor {
    int256 private _value;
    
    constructor(int256 initialValue) {
        _value = initialValue;
    }
    
    function setValue(int256 value) external {
        _value = value;
    }
    
    function getLatestValue() external view returns (int256) {
        return _value;
    }
    
    function getCurrentValue(bytes32 _queryId) external view returns (uint256) {
        // Fix: Ensure consistent types in ternary operation
        return uint256(_value > 0 ? uint256(_value) : 0);
        // Alternative fix:
        // if (_value > 0) {
        //     return uint256(_value);
        // }
        // return 0;
    }
}