pragma solidity ^0.8.0;

interface IUniswapV3Oracle {
    // Add this method required by TWAPCalculator
    function observe(uint32[] calldata secondsAgos) external view returns (
        int56[] memory tickCumulatives,
        uint160[] memory secondsPerLiquidityCumulativeX128s
    );
    
    // Keep the original methods if needed
    function consult(address tokenA, address tokenB, uint24 fee) external view returns (uint256 price);
    function getTWAP(address tokenA, address tokenB, uint24 fee, uint32 secondsAgo) external view returns (uint256 twap);
}