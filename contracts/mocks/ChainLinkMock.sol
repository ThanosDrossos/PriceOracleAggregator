// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.8.0;

import "../interfaces/IAggregatorV3.sol";

/**
 * @title ChainlinkMock
 * @dev A mock implementation that closely follows Chainlink's AggregatorV3Interface
 * Mirrors the behavior of Chainlink price feeds on Sepolia
 */
contract ChainlinkMock is IAggregatorV3 {
    int256 private _answer;
    uint256 private _updatedAt;
    string private _description;
    uint8 private _decimals;
    uint80 private _roundId;
    
    constructor(int256 initialAnswer, string memory descriptionText, uint8 decimalPlaces) {
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
        _description = descriptionText;
        _decimals = decimalPlaces;
        _roundId = 1;
    }

    /**
     * @notice Updates the price feed with a new answer
     * @param answer The new price value
     */
    function setAnswer(int256 answer) external {
        _answer = answer;
        _updatedAt = block.timestamp;
        _roundId += 1;
    }
    
    /**
     * @notice Sets the timestamp of the last update (for testing staleness)
     * @param timestamp The timestamp to set
     */
    function setUpdateTime(uint256 timestamp) external {
        require(timestamp <= block.timestamp, "Cannot set future timestamp");
        _updatedAt = timestamp;
    }

    /**
     * @notice Gets the latest round data
     * @return roundId The round ID
     * @return answer The price answer
     * @return startedAt When the round started
     * @return updatedAt When the round was last updated
     * @return answeredInRound The round in which the answer was computed
     */
    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (_roundId, _answer, _updatedAt - 60, _updatedAt, _roundId);
    }

    /**
     * @notice Gets the decimals used for price representation
     * @return The number of decimals
     */
    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Gets the description of the price feed
     * @return The description string
     */
    function description() external view override returns (string memory) {
        return _description;
    }

    /**
     * @notice Gets the version of the price feed
     * @return The version number
     */
    function version() external view override returns (uint256) {
        return 4; // Version 4 is current for most Chainlink feeds
    }

    /**
     * @notice Gets data from a specific round
     * @param _roundId The round ID to get data for
     * @return roundId The round ID
     * @return answer The price answer
     * @return startedAt When the round started
     * @return updatedAt When the round was last updated
     * @return answeredInRound The round in which the answer was computed
     */
    function getRoundData(uint80 _roundId) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        require(_roundId <= _roundId, "Round not complete");
        return (_roundId, _answer, _updatedAt - 60, _updatedAt, _roundId);
    }
}