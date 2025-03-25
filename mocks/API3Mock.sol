// filepath: price-oracle-aggregator/test/mocks/API3Mock.sol
pragma solidity ^0.8.0;

import "../interfaces/IAPI3.sol";

contract API3Mock is IAPI3 {
    int256 private price;
    bool private shouldRevert;

    constructor(int256 _initialPrice) {
        price = _initialPrice;
        shouldRevert = false;
    }

    function setPrice(int256 _newPrice) external {
        price = _newPrice;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function getPrice() external view override returns (int256) {
        require(!shouldRevert, "API3Mock: Reverted");
        return price;
    }
}