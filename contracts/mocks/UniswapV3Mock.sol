// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniswapV3Oracle.sol";

contract UniswapV3Mock is IUniswapV3Oracle {
    int56[] private _tickCumulatives;
    uint160[] private _secondsPerLiquidityCumulativeX128s;
    
    constructor(int56 tickCumulative) {
        _tickCumulatives = new int56[](2);
        _tickCumulatives[0] = tickCumulative;
        _tickCumulatives[1] = tickCumulative + 100; // Simple difference for TWAP calculation
        
        _secondsPerLiquidityCumulativeX128s = new uint160[](2);
        _secondsPerLiquidityCumulativeX128s[0] = 0;
        _secondsPerLiquidityCumulativeX128s[1] = 0;
    }
    
    function setTickCumulatives(int56 oldTick, int56 newTick) external {
        _tickCumulatives[0] = oldTick;
        _tickCumulatives[1] = newTick;
    }
    
    function observe(uint32[] calldata secondsAgos) external view returns (
        int56[] memory tickCumulatives,
        uint160[] memory secondsPerLiquidityCumulativeX128s
    ) {
        return (_tickCumulatives, _secondsPerLiquidityCumulativeX128s);
    }
    
    // Implement other required interface methods
    function consult(address tokenA, address tokenB, uint24 fee) external pure returns (uint256 price) {
        return 3000 * 10**18; // Mock price for testing
    }
    
    function getTWAP(address tokenA, address tokenB, uint24 fee, uint32 secondsAgo) external view returns (uint256 twap) {
        return 3000 * 10**18; // Mock TWAP for testing
    }
}