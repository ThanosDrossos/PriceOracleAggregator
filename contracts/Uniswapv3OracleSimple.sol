// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.8.0;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "./interfaces/IUniswapV3Oracle.sol";

contract UniswapV3OracleSimple is IUniswapV3Oracle {
    IUniswapV3Factory public immutable factory;
    uint32 public immutable period;  // TWAP window in seconds

    constructor(address _factory, uint32 _period) {
        factory = IUniswapV3Factory(_factory);
        period = _period;
    }

    /// @notice Observe and return time-weighted average tick & liquidity
    function observe(uint32[] calldata secondsAgos)
        external view override
        returns (int56[] memory ticks, uint160[] memory secsPerLiq)
    {
        address poolAddr = factory.getPool(
            IUniswapV3Factory(_factory).token0(),
            IUniswapV3Factory(_factory).token1(),
            3000
        );
        require(poolAddr != address(0), "Pool not found");
        return IUniswapV3Pool(poolAddr).observe(secondsAgos);
    }

    /// @notice Return TWAP as a UQ64.96 price for tokenA/tokenB
    function getTWAP(
        address tokenA,
        address tokenB,
        uint24 fee,
        uint32 secondsAgo
    ) external view override returns (uint256 twap) {
        address poolAddr = factory.getPool(tokenA, tokenB, fee);
        require(poolAddr != address(0), "Pool not found");
        // Observe [secondsAgo, 0] to get tick cumulatives
        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(poolAddr)
            .observe([secondsAgo, uint32(0)]);
        int56 delta = tickCumulatives[1] - tickCumulatives[0];
        int24 avgTick = int24(delta / int56(int32(secondsAgo)));
        // Convert tick to quote amount for 1e18 base units
        twap = OracleLibrary.getQuoteAtTick(
            avgTick,
            uint128(1e18),
            tokenA,
            tokenB
        );
    }

    /// @notice Simple consult wrapper for legacy interface
    function consult(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view override returns (uint256 price) {
        return this.getTWAP(tokenA, tokenB, fee, period);
    }
}
