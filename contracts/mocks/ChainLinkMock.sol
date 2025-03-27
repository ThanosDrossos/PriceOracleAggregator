pragma solidity ^0.8.0;

import "../interfaces/IAggregatorV3.sol";

contract ChainlinkMock is IAggregatorV3 {
    int256 private _answer;
    uint256 private _updatedAt;
    string private _description;
    uint8 private _decimals;

    // Fix parameter names to avoid conflict
    constructor(int256 initialAnswer, string memory descriptionText, uint8 decimalPlaces) {
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
        _description = descriptionText;
        _decimals = decimalPlaces;
    }

    function setAnswer(int256 answer) external {
        _answer = answer;
        _updatedAt = block.timestamp;
    }

    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (1, _answer, block.timestamp, _updatedAt, 1);
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external view override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _roundId) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (1, _answer, block.timestamp, _updatedAt, 1);
    }
}