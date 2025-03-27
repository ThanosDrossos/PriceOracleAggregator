// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniswapV3Oracle.sol";

// Changed from library to contract
contract TWAPCalculator {
    uint32 public constant TWAP_PERIOD = 1800; // 30 minutes TWAP by default

    // Changed from internal to public
    function getTWAP(IUniswapV3Oracle oracle) public view returns (int256) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = TWAP_PERIOD; // From 30 minutes ago
        secondsAgos[1] = 0; // To current time
        
        (int56[] memory tickCumulatives, ) = oracle.observe(secondsAgos);
        
        // Calculate TWAP from tick cumulatives
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 timeWeightedAverageTick = int24(tickCumulativesDelta / int56(uint56(TWAP_PERIOD)));
        
        // Convert tick to price
        uint160 sqrtPriceX96 = getSqrtRatioAtTick(timeWeightedAverageTick);
        uint256 price = getPriceFromSqrtRatio(sqrtPriceX96);
        
        return int256(price);
    }
    
    // Keep internal helper functions
    function getSqrtRatioAtTick(int24 tick) public pure returns (uint160) {
        // This is a simplified version - in production you'd use the actual UniswapV3 library
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        uint256 ratio = tick < 0 ? 1e18 / (1e18 + absTick * 0.0001e18) : 1e18 + absTick * 0.0001e18;
        
        // Convert to sqrtPriceX96 format used by Uniswap
        uint256 sqrtRatio = sqrt(ratio * 2**96);
        return uint160(sqrtRatio);
    }
    
    function getPriceFromSqrtRatio(uint160 sqrtPriceX96) public pure returns (uint256) {
        return uint256(sqrtPriceX96) * uint256(sqrtPriceX96) / (2**96);
    }
    
    function sqrt(uint256 x) public pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}