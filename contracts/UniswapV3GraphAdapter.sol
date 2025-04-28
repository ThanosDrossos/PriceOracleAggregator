// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.8.0;

import "./interfaces/IUniswapV3Oracle.sol";

/**
 * @title UniswapV3GraphAdapter
 * @dev Adapter for Uniswap V3 price data that's designed to work with off-chain GraphQL data
 * This contract acts as a placeholder that's updated by an external service fetching GraphQL data
 */
contract UniswapV3GraphAdapter is IUniswapV3Oracle {
    address public owner;
    int56 private _mockTickCumulative1;
    int56 private _mockTickCumulative2;
    
    // Price data structure
    struct PriceData {
        uint256 price;
        uint256 lastUpdated;
        string pairSymbol;
        uint256 liquidity;
    }
    
    // Price data mapping by token pair hash (keccak256(tokenA, tokenB, fee))
    mapping(bytes32 => PriceData) public priceData;
    
    event PriceUpdated(bytes32 indexed pairHash, uint256 price, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
        
        // Initialize tick cumulatives for observe() function
        _mockTickCumulative1 = 1000000;  // Just default values
        _mockTickCumulative2 = 1001000;  // Higher than first to represent passage of time
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    /**
     * @notice Update price data for a token pair (called by off-chain service)
     * @param tokenA The first token address
     * @param tokenB The second token address
     * @param fee The pool fee tier (e.g., 3000 for 0.3%)
     * @param price The latest price from The Graph, scaled to 1e18
     * @param pairSymbol Human-readable pair symbol (e.g., "ETH-USDC")
     * @param liquidity Current pool liquidity
     */
    function updatePrice(
        address tokenA,
        address tokenB,
        uint24 fee,
        uint256 price,
        string calldata pairSymbol,
        uint256 liquidity
    ) external onlyOwner {
        bytes32 pairHash = keccak256(abi.encodePacked(tokenA, tokenB, fee));
        
        priceData[pairHash] = PriceData({
            price: price,
            lastUpdated: block.timestamp,
            pairSymbol: pairSymbol,
            liquidity: liquidity
        });
        
        emit PriceUpdated(pairHash, price, block.timestamp);
    }
    
    /**
     * @notice Update mock tick cumulatives for observe() function
     * @param tick1 The first tick cumulative
     * @param tick2 The second tick cumulative
     */
    function updateTickCumulatives(int56 tick1, int56 tick2) external onlyOwner {
        _mockTickCumulative1 = tick1;
        _mockTickCumulative2 = tick2;
    }
    
    /**
     * @notice Get the latest price for a token pair
     * @param tokenA The first token address
     * @param tokenB The second token address
     * @param fee The pool fee tier
     * @return price The price, scaled to 1e18
     */
    function getTWAP(
        address tokenA,
        address tokenB,
        uint24 fee,
        uint32 secondsAgo
    ) external view override returns (uint256 price) {
        bytes32 pairHash = keccak256(abi.encodePacked(tokenA, tokenB, fee));
        PriceData memory data = priceData[pairHash];
        
        require(data.lastUpdated > 0, "No price data available");
        require(block.timestamp - data.lastUpdated < 1 hours, "Price data is stale");
        
        return data.price;
    }
    
    /**
     * @notice Legacy consult interface for backward compatibility
     */
    function consult(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view override returns (uint256 price) {
        return this.getTWAP(tokenA, tokenB, fee, 0);
    }
    
    /**
     * @notice Mock observe function to satisfy IUniswapV3Oracle interface
     * Real data from TheGraph doesn't work with this on-chain model, so we return
     * mock data that will produce expected behavior in the TWAPCalculator
     */
    function observe(uint32[] calldata secondsAgos) external view override returns (
        int56[] memory tickCumulatives,
        uint160[] memory secondsPerLiquidityCumulativeX128s
    ) {
        // Mock data to support the TWAPCalculator contract
        tickCumulatives = new int56[](2);
        tickCumulatives[0] = _mockTickCumulative1;
        tickCumulatives[1] = _mockTickCumulative2;
        
        secondsPerLiquidityCumulativeX128s = new uint160[](2);
        secondsPerLiquidityCumulativeX128s[0] = 0;
        secondsPerLiquidityCumulativeX128s[1] = 0;
        
        return (tickCumulatives, secondsPerLiquidityCumulativeX128s);
    }
    
    /**
     * @notice Transfer ownership to a new address
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}