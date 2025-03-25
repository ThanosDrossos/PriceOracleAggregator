// filepath: price-oracle-aggregator/test/mocks/UniswapV3Mock.sol
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV3Mock {
    uint256 private price;

    constructor(uint256 initialPrice) {
        price = initialPrice;
    }

    function setPrice(uint256 newPrice) external {
        price = newPrice;
    }

    function getPrice() external view returns (uint256) {
        return price;
    }

    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory, uint160[] memory) {
        int56[] memory tickCumulatives = new int56[](secondsAgos.length);
        uint160[] memory secondsPerLiquidityCumulativeX128 = new uint160[](secondsAgos.length);

        for (uint256 i = 0; i < secondsAgos.length; i++) {
            tickCumulatives[i] = int56(price); // Mocking the price as the tick cumulative
            secondsPerLiquidityCumulativeX128[i] = uint160(price); // Mocking the seconds per liquidity
        }

        return (tickCumulatives, secondsPerLiquidityCumulativeX128);
    }
}