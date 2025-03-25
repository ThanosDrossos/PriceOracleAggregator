interface IUniswapV3Oracle {
    function consult(address tokenA, address tokenB, uint24 fee) external view returns (uint256 price);
    function getTWAP(address tokenA, address tokenB, uint24 fee, uint32 secondsAgo) external view returns (uint256 twap);
}