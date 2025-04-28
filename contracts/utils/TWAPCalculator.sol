// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniswapV3Oracle.sol";

contract TWAPCalculator {
    uint32 public constant TWAP_PERIOD = 1800; // 30 minutes TWAP by default

    // Simplified TWAP function that just gets price from the adapter
    function getTWAP(IUniswapV3Oracle oracle) public view returns (int256) {
        // We don't need to calculate real TWAP since our adapter returns the price directly
        (int56[] memory tickCumulatives, ) = oracle.observe(new uint32[](2));
        
        // Convert the mock tick data to a price for consistency
        int56 tickDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 avgTick = int24(tickDelta / int56(int32(TWAP_PERIOD)));
        
        // Simple price calculation based on tick
        uint256 price = convertTickToPrice(avgTick);
        return int256(price);
    }
    
    // Simplified tick to price conversion
    function convertTickToPrice(int24 tick) internal pure returns (uint256) {
        // Simple approximation: 1.0001^tick
        if (tick >= 0) {
            return 1e18 * (10000 + uint256(int256(tick))) / 10000;
        } else {
            return 1e18 * 10000 / (10000 - uint256(int256(tick)));
        }
    }
}