# Decentralized Price Oracle Aggregator

Final project for UNAM class "Fundamentos Teóricos y Prácticos de Blockchain"

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
- **API3**: First-party oracle solution with multiple price feeds

## Deployed Contracts (Sepolia Testnet)

### Core Contracts

| Contract                | Address | Verification Status |
|-------------------------|---------|-------------------|
| PriceAggregator         | `0x369a056B626460280Cc9D8875E82b6b54385c502` | ✅ Verified |
| OracleLib               | `0x6d6CE54F18eA21B2d519C88fA50516bf09C590Ae` | ✅ Verified |
| TWAPCalculator          | `0xeCfc80226C67C040503Ae36cb1e297b72fe74623` | ✅ Verified |
| UniswapV3GraphAdapter   | `0x6EBe2E5684696C4F63Fd125Ddaf87b9a55441CB7` | ✅ Verified |

### API3 Adapters

| Contract                | Address | Price Feed | Status |
|-------------------------|---------|------------|--------|
| API3Adapter (ETH/USD)   | `0xA5205e157153865f5f93fB6D407c9fA147498A75` | ETH/USD | ✅ Active |
| API3Adapter (BTC/USD)   | `0x736C000687B80d8c93c02741be46FC8FfEa49c35` | BTC/USD | ✅ Active |
| API3Adapter (UNI/USD)   | `0xacf67579871c57951713345E5AA9364ad63E9000` | UNI/USD | ✅ Active |

### Tellor Adapters

| Contract                | Address | Price Feed | Status |
|-------------------------|---------|------------|--------|
| TellorAdapter (ETH/USD) | `0xB133D2dbaad38A9785F69D10a3EECAEF2d142365` | ETH/USD | ✅ Active |
| TellorAdapter (BTC/USD) | `0xE8BcD7D38B642B6BB37AD9C36F6A1bBF6E7fb44D` | BTC/USD | ✅ Active |
| TellorAdapter (LINK/USD)| `0x99EcFCFd363F4108706Ccc7113c3becC977116ce` | LINK/USD | ⚠️ No recent data |
| TellorAdapter (UNI/USD) | `0x2d55152A8840479E0Bc2b25196B21e5E64B1D4De` | UNI/USD | ⚠️ No recent data |

### Chainlink Price Feeds

| Contract                | Address | Price Feed | Status |
|-------------------------|---------|------------|--------|
| Chainlinlk ETH/USD   | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | ETH/USD | ✅ Active |
| Chainlink BTC/USD | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` | BTC/USD | ✅ Active |
| Chainlink LINK/USD | `0xc59E3633BAAC79493d908e63626716e204A45EdF` | LINK/USD | ✅ Active |

> **Note**: All contracts are deployed and verified on Sepolia Etherscan. Some Tellor feeds may have limited data availability on testnet.

## Latest Test Results (Sepolia Testnet)

### ✅ Comprehensive Test Summary
- **Tested**: 3 trading pairs (ETH-USD, BTC-USD, UNI-USD)
- **Oracle Types**: All 4 types verified (Chainlink, Uniswap, Tellor, API3)
- **Price Aggregation**: Both median and weighted methods working
- **Error Handling**: Proper validation and edge case handling
- **Gas Efficiency**: All operations under 300,000 gas

### 📊 Live Price Feed Status

#### ETH/USD - All Sources Active ✅
```
Chainlink ETH/USD: $2,556.92 (Fresh)
Uniswap ETH/USD:   $2,547.64 (Fresh) 
Tellor ETH/USD:    $2,553.19 (Fresh)
API3 ETH/USD:      $2,547.67 (Fresh)

Median Price:      $2,550.43
Weighted Price:    $2,552.51
Price Spread:      0.36% (Excellent)
```

#### BTC/USD - All Sources Active ✅
```
Chainlink BTC/USD: $104,249.27 (Fresh)
Uniswap BTC/USD:   $104,403.35 (Fresh)
Tellor BTC/USD:    $105,540.45 (Fresh)
API3 BTC/USD:      $104,757.39 (Fresh)

Median Price:      $104,503.33
Weighted Price:    $104,370.12
```

#### UNI/USD - Partial Sources Active ⚠️
```
Chainlink UNI/USD: $13.89 (Fresh) - Using LINK proxy
Uniswap UNI/USD:   $6.30 (Fresh)
Tellor UNI/USD:    No Data Available
API3 UNI/USD:      $6.31 (Fresh)

Median Price:      $13.89
Note: Limited Tellor data for UNI on testnet
```

### ⚡ Performance Metrics
```
Gas Usage (Average):
- Median Price:     ~213,000 gas
- Weighted Price:   ~206,000 gas  
- Aggregated Price: ~273,000 gas
- All Prices:       ~202,000 gas
```

## Quick Start

### Option 1: Using Already Deployed Contracts

If the contracts are already deployed on Sepolia, you can interact with them directly:

```javascript
const { ethers } = require('ethers');

// Connect to Sepolia
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');
const priceAggregatorAddress = '0x3aCf6221b838B9c60FaFDe95fCF5d14218a0D6eb'; // Replace with actual address

// ABI for basic price fetching (minimal interface)
const priceAggregatorABI = [
  "function getMedianPrice(string memory pairSymbol) public view returns (int256)",
  "function getWeightedPrice(string memory pairSymbol) public view returns (int256)",
  "function getAggregatedPrice(string memory pairSymbol) external view returns (int256 medianPrice, int256 weightedPrice)",
  "function getAllPrices(string memory pairSymbol) external view returns (int256[] memory prices, uint8[] memory sourceTypes, string[] memory descriptions, uint256[] memory timestamps)"
];

// Create contract instance
const priceAggregator = new ethers.Contract(priceAggregatorAddress, priceAggregatorABI, provider);

// Get ETH/USD price
async function getETHPrice() {
  try {
    const [medianPrice, weightedPrice] = await priceAggregator.getAggregatedPrice("ETH-USD");
    console.log(`ETH/USD Median Price: $${ethers.formatUnits(medianPrice, 18)}`);
    console.log(`ETH/USD Weighted Price: $${ethers.formatUnits(weightedPrice, 18)}`);
  } catch (error) {
    console.error('Error fetching price:', error);
  }
}

getETHPrice();
```

### Option 2: Full Installation & Deployment

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**
- **Sepolia testnet ETH** (get from [Sepolia Faucet](https://sepoliafaucet.com/))
- **Infura/Alchemy API key**
- **Etherscan API key** (for contract verification)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ThanosDrossos/PriceOracleAggregator.git
   cd PriceOracleAggregator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file:**
   ```env
   # Wallet Configuration
   PRIVATE_KEY=your_wallet_private_key_here

   # RPC Provider (choose one)
   INFURA_API_KEY=your_infura_api_key_here
   ALCHEMY_API_KEY=your_alchemy_api_key_here

   # Contract Verification
   ETHERSCAN_API_KEY=your_etherscan_api_key_here

   # Optional: Pre-deployed contract addresses
   UNISWAP_ADAPTER_ADDRESS=deployed_uniswap_adapter_address
   PRICE_AGGREGATOR_ADDRESS=deployed_price_aggregator_address
   ```

## Deployment

### 1. Deploy to Sepolia Testnet

Run the complete test and deployment script:

```bash
npx hardhat test test/PriceAggregator.comprehensive.sepolia.test.js --network sepolia
```

This will deploy:
- ✅ OracleLib utility contract
- ✅ TWAPCalculator utility contract  
- ✅ TellorAdapter contracts (ETH-USD, BTC-USD, LINK-USD)
- ✅ API3Adapter contract (ETH-USD only)
- ✅ UniswapV3GraphAdapter contract
- ✅ PriceAggregator main contract with configured asset pairs

### 2. Update Uniswap Price Data

After deployment, update the Uniswap V3 price feeds with data from The Graph:

```bash
export UNISWAP_ADAPTER_ADDRESS=<deployed_adapter_address>
npx hardhat run scripts/updateUniswapPrices.js --network sepolia
```

### 4. Test Local Deployment

For local testing with mock oracles:

```bash
npx hardhat run scripts/deploy-local.js --network localhost
```

## Usage Examples

### Basic Price Fetching

```javascript
const { ethers } = require('hardhat');

async function basicPriceExample() {
  const priceAggregator = await ethers.getContractAt(
    "PriceAggregator", 
    "0x3aCf6221b838B9c60FaFDe95fCF5d14218a0D6eb"
  );

  // Get median price for ETH/USD
  const medianPrice = await priceAggregator.getMedianPrice("ETH-USD");
  console.log(`ETH/USD Median: $${ethers.formatUnits(medianPrice, 18)}`);

  // Get weighted average price
  const weightedPrice = await priceAggregator.getWeightedPrice("ETH-USD");
  console.log(`ETH/USD Weighted: $${ethers.formatUnits(weightedPrice, 18)}`);

  // Get both prices at once
  const [median, weighted] = await priceAggregator.getAggregatedPrice("ETH-USD");
  console.log(`Median: $${ethers.formatUnits(median, 18)}`);
  console.log(`Weighted: $${ethers.formatUnits(weighted, 18)}`);
}
```

### Advanced Price Analysis

```javascript
async function detailedPriceAnalysis() {
  const priceAggregator = await ethers.getContractAt(
    "PriceAggregator", 
    "0x3aCf6221b838B9c60FaFDe95fCF5d14218a0D6eb"
  );

  // Get detailed price data from all sources
  const [prices, sourceTypes, descriptions, timestamps] = 
    await priceAggregator.getAllPrices("ETH-USD");

  console.log("\n=== ETH/USD Price Analysis ===");
  
  for (let i = 0; i < prices.length; i++) {
    const price = ethers.formatUnits(prices[i], 18);
    const sourceType = getSourceTypeName(sourceTypes[i]);
    const lastUpdate = new Date(timestamps[i] * 1000).toLocaleString();
    
    console.log(`${descriptions[i]} (${sourceType}): $${price}`);
    console.log(`  Last updated: ${lastUpdate}`);
    console.log(`  Status: ${prices[i] > 0 ? '✅ Active' : '❌ Inactive'}\n`);
  }
}

function getSourceTypeName(type) {
  const types = ['Chainlink', 'Uniswap', 'Tellor', 'API3'];
  return types[type] || 'Unknown';
}
```

### Enhanced Tellor Analytics

```javascript
async function tellorAnalytics() {
  const priceAggregator = await ethers.getContractAt(
    "PriceAggregator", 
    "0x3aCf6221b838B9c60FaFDe95fCF5d14218a0D6eb"
  );

  const tellorAdapterAddress = "0x[DEPLOYED_TELLOR_ADAPTER_ADDRESS]";

  // Get Tellor-specific analytics
  const [valueCount, lastReporter, lastTimestamp, isLastDisputed] = 
    await priceAggregator.getTellorAnalytics(tellorAdapterAddress);

  console.log("\n=== Tellor Analytics ===");
  console.log(`Total values submitted: ${valueCount}`);
  console.log(`Last reporter: ${lastReporter}`);
  console.log(`Last update: ${new Date(lastTimestamp * 1000).toLocaleString()}`);
  console.log(`Last value disputed: ${isLastDisputed ? '⚠️ Yes' : '✅ No'}`);

  // Check for disputed data across all Tellor sources
  const [hasDisputed, disputedSources] = 
    await priceAggregator.checkTellorDisputes("ETH-USD");

  if (hasDisputed) {
    console.log("\n⚠️ Disputed Tellor Data Found:");
    disputedSources.forEach(source => console.log(`  - ${source}`));
  } else {
    console.log("\n✅ No disputed Tellor data");
  }

  // Get historical Tellor data for trend analysis
  const [values, timestamps] = 
    await priceAggregator.getTellorHistoricalData(
      tellorAdapterAddress, 
      86400, // 24 hours
      10     // last 10 values
    );

  console.log("\n=== Historical Tellor Data (Last 10 values) ===");
  for (let i = 0; i < values.length; i++) {
    const price = ethers.formatUnits(values[i], 18);
    const time = new Date(timestamps[i] * 1000).toLocaleString();
    console.log(`$${price} at ${time}`);
  }
}
```

### Web3 Frontend Integration

```javascript
// React/Next.js example
import { ethers } from 'ethers';

export class PriceOracleService {
  constructor(providerUrl, contractAddress) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.contract = new ethers.Contract(contractAddress, ABI, this.provider);
  }

  async getPrice(pair = "ETH-USD") {
    try {
      const [median, weighted] = await this.contract.getAggregatedPrice(pair);
      return {
        median: parseFloat(ethers.formatUnits(median, 18)),
        weighted: parseFloat(ethers.formatUnits(weighted, 18)),
        pair
      };
    } catch (error) {
      console.error(`Error fetching ${pair} price:`, error);
      throw error;
    }
  }

  async getAllSourcePrices(pair = "ETH-USD") {
    try {
      const [prices, types, descriptions, timestamps] = 
        await this.contract.getAllPrices(pair);
      
      return prices.map((price, index) => ({
        price: parseFloat(ethers.formatUnits(price, 18)),
        source: descriptions[index],
        type: ['Chainlink', 'Uniswap', 'Tellor', 'API3'][types[index]],
        lastUpdate: new Date(timestamps[index] * 1000),
        active: price > 0
      }));
    } catch (error) {
      console.error(`Error fetching ${pair} source prices:`, error);
      throw error;
    }
  }
}

// Usage in React component
const priceService = new PriceOracleService(
  'https://sepolia.infura.io/v3/YOUR_KEY',
  '0x3aCf6221b838B9c60FaFDe95fCF5d14218a0D6eb'
);

// In your component
useEffect(() => {
  const fetchPrices = async () => {
    try {
      const ethPrice = await priceService.getPrice("ETH-USD");
      const btcPrice = await priceService.getPrice("BTC-USD");
      const sourcePrices = await priceService.getAllSourcePrices("ETH-USD");
      
      setPrices({ eth: ethPrice, btc: btcPrice, sources: sourcePrices });
    } catch (error) {
      console.error('Price fetch failed:', error);
    }
  };

  fetchPrices();
  const interval = setInterval(fetchPrices, 30000); // Update every 30s
  return () => clearInterval(interval);
}, []);
```

## Administrative Functions

### Adding New Oracle Sources

As the contract owner, you can add new oracle sources:

```javascript
async function addNewOracleSource() {
  const [owner] = await ethers.getSigners();
  const priceAggregator = await ethers.getContractAt(
    "PriceAggregator", 
    "0x3aCf6221b838B9c60FaFDe95fCF5d14218a0D6eb",
    owner
  );

  const newSource = {
    oracle: "0x[NEW_ORACLE_ADDRESS]",
    oracleType: 0, // 0: Chainlink, 1: Uniswap, 2: Tellor, 3: API3
    weight: ethers.parseUnits("2", 18), // Weight of 2
    heartbeatSeconds: 3600, // 1 hour staleness threshold
    description: "New Oracle Source Description",
    decimals: 8 // Price decimals
  };

  await priceAggregator.addOracleSource(newSource);
  console.log("New oracle source added successfully!");
}
```

### Adding New Asset Pairs

```javascript
async function addNewAssetPair() {
  const [owner] = await ethers.getSigners();
  const priceAggregator = await ethers.getContractAt(
    "PriceAggregator", 
    "0x3aCf6221b838B9c60FaFDe95fCF5d14218a0D6eb",
    owner
  );

  // Define the oracle addresses that support this pair
  const oracleSources = [
    "0x[CHAINLINK_ORACLE_ADDRESS]",
    "0x[UNISWAP_ORACLE_ADDRESS]",
    "0x[TELLOR_ORACLE_ADDRESS]"
  ];

  await priceAggregator.addAssetPair(
    "UNI-USD",    // Symbol
    "UNI",        // Base asset
    "USD",        // Quote asset
    oracleSources // Array of oracle addresses
  );

  console.log("UNI-USD pair added successfully!");
}
```

## Supported Trading Pairs

The following trading pairs are currently supported:

| Pair | Chainlink | Uniswap V3 | Tellor | API3 |
|------|-----------|------------|--------|------|
| ETH-USD | ✅ | ✅ | ✅ | ✅ |
| BTC-USD | ✅ | ✅ | ✅ | ✅ |
| LINK-USD | ✅ | ✅ | ✅ | ❌ |

## Maintenance & Monitoring

### Automated Uniswap Price Updates

Set up a cron job to regularly update Uniswap V3 prices:

```bash
# Add to crontab (crontab -e)
*/15 * * * * cd /path/to/project && npx hardhat run scripts/updateUniswapPrices.js --network sepolia
```

### Price Monitoring Script

```javascript
// monitor-prices.js
const { ethers } = require('hardhat');

async function monitorPrices() {
  const priceAggregator = await ethers.getContractAt(
    "PriceAggregator", 
    process.env.PRICE_AGGREGATOR_ADDRESS
  );

  const pairs = ["ETH-USD", "BTC-USD", "LINK-USD"];

  for (const pair of pairs) {
    try {
      const [median, weighted] = await priceAggregator.getAggregatedPrice(pair);
      const [prices, types, descriptions] = await priceAggregator.getAllPrices(pair);
      
      console.log(`\n=== ${pair} ===`);
      console.log(`Median: $${ethers.formatUnits(median, 18)}`);
      console.log(`Weighted: $${ethers.formatUnits(weighted, 18)}`);
      
      // Check for failed sources
      let failedSources = 0;
      prices.forEach((price, i) => {
        if (price === 0n) {
          console.log(`⚠️ ${descriptions[i]} failed`);
          failedSources++;
        }
      });

      if (failedSources > 0) {
        console.log(`❌ ${failedSources}/${prices.length} sources failed for ${pair}`);
      } else {
        console.log(`✅ All sources active for ${pair}`);
      }

    } catch (error) {
      console.error(`❌ Error fetching ${pair}:`, error.message);
    }
  }
}

// Run monitoring
monitorPrices()
  .then(() => console.log('\n✅ Monitoring complete'))
  .catch(console.error);
```

## Testing

Run the comprehensive test suite:

```bash
# Local tests with mocks
npx hardhat test test/PriceAggregator.comprehensive.test.js

# Sepolia testnet tests (requires deployed contracts)
npx hardhat test test/PriceAggregator.sepolia.test.js --network sepolia

# Individual adapter tests
npx hardhat test test/ChainlinkAdapterTest.js --network sepolia
npx hardhat test test/TellorAdapterTest.js --network sepolia
npx hardhat test test/API3AdapterTest.js --network sepolia
```

## Troubleshooting

### Common Issues

1. **"Insufficient valid prices" error**
   - Check if oracle sources are responding
   - Verify network connectivity
   - Ensure Uniswap prices are updated

2. **"Price is stale" error**
   - Run the Uniswap update script
   - Check heartbeat settings
   - Verify oracle data freshness

3. **Gas estimation failed**
   - Increase gas limit in hardhat.config.js
   - Check Sepolia ETH balance
   - Verify contract addresses

4. **Tellor data disputed**
   - Use the `checkTellorDisputes()` function to identify disputed sources
   - Consider excluding disputed Tellor data temporarily

### Getting Help

- Check the [Issues](https://github.com/ThanosDrossos/PriceOracleAggregator/issues) page
- Review test files for usage examples
- Verify contract addresses on [Sepolia Etherscan](https://sepolia.etherscan.io/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Submit a pull request

---

**⚠️ Important Security Notes:**
- Always verify contract addresses before interacting
- Use appropriate gas limits for transactions
- Monitor for disputed Tellor data in production
- Keep private keys secure and never commit them to version control
