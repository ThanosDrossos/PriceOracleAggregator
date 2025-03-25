// filepath: price-oracle-aggregator/test/mocks/ChainlinkMock.sol
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ChainlinkMock is AggregatorV3Interface {
    int256 private price;
    uint256 private updatedAt;

    constructor(int256 initialPrice) {
        price = initialPrice;
        updatedAt = block.timestamp;
    }

    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 timeStamp,
        uint80 answeredInRound
    ) {
        return (0, price, 0, updatedAt, 0);
    }

    function setPrice(int256 newPrice) external {
        price = newPrice;
        updatedAt = block.timestamp;
    }

    function getRoundData(uint80 /*_roundId*/) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 timeStamp,
        uint80 answeredInRound
    ) {
        return (0, price, 0, updatedAt, 0);
    }

    function latestAnswer() external view returns (int256) {
        return price;
    }

    function latestTimestamp() external view returns (uint256) {
        return updatedAt;
    }
}