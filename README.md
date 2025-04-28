# Decentralized Price Oracle Aggregator

A robust price oracle aggregator for DeFi applications that combines data from multiple sources (Chainlink, Uniswap V3, Tellor, and API3) to provide manipulation-resistant price feeds.

## Features

- **Multi-Oracle Aggregation**: Combines price data from multiple trusted oracles
- **Weighted Averaging**: Configurable weights for different price sources
- **Median Price Calculation**: Protection against outliers and manipulation
- **Staleness Detection**: Prevents usage of outdated price data
- **Adaptable Architecture**: Easily add new price oracles through adapter pattern
- **Governance**: Owner-controlled settings and configurations

## Supported Oracle Sources

- **Chainlink**: Industry standard decentralized oracle network
- **Uniswap V3**: Time-weighted average prices (TWAP) from Uniswap V3 pools
- **Tellor**: Decentralized oracle network with token-incentivized reporting
- **API3**: First-party oracle solution (ETH/USD support only)

## Deployed Contracts (Sepolia)

Replace these values with your actual deployed contract addresses after running the deployment script.

| Contract                | Address |
|-------------------------|---------|
| PriceAggregator         | TBD     |
| OracleLib               | TBD     |
| TWAPCalculator          | TBD     |
| UniswapV3GraphAdapter   | TBD     |
| API3Adapter (ETH-USD)   | TBD     |
| TellorAdapter (ETH-USD) | TBD     |
| TellorAdapter (BTC-USD) | TBD     |
| TellorAdapter (LINK-USD)| TBD     |

## Getting Started

### Prerequisites

- Node.js (v16+)
- Hardhat
- Ethers.js
- Sepolia testnet ETH
- Infura/Alchemy API key
- Etherscan API key (for verification)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/ThanosDrossos/PriceOracleAggregator.git
   cd PriceOracleAggregator
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create `.env` file with your credentials:
   ```
   PRIVATE_KEY=your_wallet_private_key_here
   INFURA_API_KEY=your_infura_api_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

### Deployment

1. Deploy all contracts to Sepolia:
   ```
   npx hardhat run scripts/deploy.js --network sepolia
   ```

2. Update the Uniswap V3 price feed with data from The Graph:
   ```
   export UNISWAP_ADAPTER_ADDRESS=<deployed_adapter_address>
   npx hardhat run scripts/updateUniswapPrices.js --network sepolia
   ```

3. Verify contracts on Etherscan (the deploy script will output the necessary commands)

### Usage

Once deployed, interact with the PriceAggregator contract to:

1. Get the median price for a trading pair:
   ```solidity
   int256 medianPrice = priceAggregator.getMedianPrice("ETH-USD");
   ```

2. Get the weighted average price:
   ```solidity
   int256 weightedPrice = priceAggregator.getWeightedPrice("ETH-USD");
   ```

3. Get both price types at once:
   ```solidity
   (int256 medianPrice, int256 weightedPrice) = priceAggregator.getAggregatedPrice("ETH-USD");
   ```

4. Get detailed price data from all sources:
   ```solidity
   (int256[] memory prices, uint8[] memory sourceTypes, string[] memory descriptions, uint256[] memory timestamps) = priceAggregator.getAllPrices("ETH-USD");
   ```

## Setting Up a New Oracle for a Trading Pair

As an admin, you can add new oracle sources and trading pairs:

1. Deploy the appropriate adapter for the new oracle

2. Add the new oracle source:
   ```solidity
   priceAggregator.addOracleSource({
     oracle: oracleAddress,
     oracleType: oracleTypeID, // 0: Chainlink, 1: Uniswap, 2: Tellor, 3: API3
     weight: weightValue,       // e.g., ethers.utils.parseUnits("1", 18)
     heartbeatSeconds: 3600,    // 1 hour maximum staleness
     description: "Description of the oracle",
     decimals: 18               // Decimal precision of the price feed
   });
   ```

3. Create a new asset pair:
   ```solidity
   priceAggregator.addAssetPair(
     "TOKEN-USD",
     "TOKEN",
     "USD",
     [oracle1Address, oracle2Address, oracle3Address]
   );
   ```

## Maintenance

For the Uniswap V3 price source, you need to periodically update the prices from The Graph:

```
npx hardhat run scripts/updateUniswapPrices.js --network sepolia
```

Consider setting up a cron job or a similar service to automate this process.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
