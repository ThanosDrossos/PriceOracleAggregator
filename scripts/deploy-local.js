const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 1. Deploy utility contracts
  console.log("\n=== Deploying Utility Contracts ===");
  
  const OracleLib = await ethers.getContractFactory("OracleLib");
  const oracleLib = await OracleLib.deploy();
  await oracleLib.deployed();
  console.log("OracleLib deployed to:", oracleLib.address);
  
  const TWAPCalculator = await ethers.getContractFactory("TWAPCalculator");
  const twapCalculator = await TWAPCalculator.deploy();
  await twapCalculator.deployed();
  console.log("TWAPCalculator deployed to:", twapCalculator.address);

  // 2. Deploy mock oracles for local testing
  console.log("\n=== Deploying Mock Oracles ===");
  
  // Chainlink mocks
  const ChainlinkMock = await ethers.getContractFactory("ChainlinkMock");
  const chainlinkEthUsd = await ChainlinkMock.deploy(
    ethers.utils.parseUnits("3000", 8), // $3000 with 8 decimals
    "ETH / USD",
    8
  );
  await chainlinkEthUsd.deployed();
  console.log("Chainlink ETH/USD Mock deployed to:", chainlinkEthUsd.address);
  
  const chainlinkBtcUsd = await ChainlinkMock.deploy(
    ethers.utils.parseUnits("60000", 8), // $60000 with 8 decimals
    "BTC / USD",
    8
  );
  await chainlinkBtcUsd.deployed();
  console.log("Chainlink BTC/USD Mock deployed to:", chainlinkBtcUsd.address);
  
  // Tellor mocks
  const TellorMock = await ethers.getContractFactory("TellorMock");
  const tellorEthUsd = await TellorMock.deploy(ethers.utils.parseUnits("3000", 18));
  await tellorEthUsd.deployed();
  console.log("Tellor ETH/USD Mock deployed to:", tellorEthUsd.address);
  
  const tellorBtcUsd = await TellorMock.deploy(ethers.utils.parseUnits("60000", 18));
  await tellorBtcUsd.deployed();
  console.log("Tellor BTC/USD Mock deployed to:", tellorBtcUsd.address);
  
  // Uniswap mock
  const UniswapV3Mock = await ethers.getContractFactory("UniswapV3Mock");
  const uniswapMock = await UniswapV3Mock.deploy(1000000); // Initial tick
  await uniswapMock.deployed();
  console.log("Uniswap Mock deployed to:", uniswapMock.address);
  
  // API3 mock
  const API3Mock = await ethers.getContractFactory("API3Mock");
  const api3EthUsd = await API3Mock.deploy(ethers.utils.parseUnits("3000", 18));
  await api3EthUsd.deployed();
  console.log("API3 ETH/USD Mock deployed to:", api3EthUsd.address);

  // 3. Configure oracle sources
  console.log("\n=== Configuring Oracle Sources ===");
  
  const ethUsdSources = [
    { 
      oracle: chainlinkEthUsd.address, 
      oracleType: 0, // Chainlink
      weight: ethers.utils.parseUnits("3", 18), // Higher weight for Chainlink
      heartbeatSeconds: 3600,
      description: "Chainlink ETH/USD",
      decimals: 8
    },
    { 
      oracle: uniswapMock.address, 
      oracleType: 1, // Uniswap
      weight: ethers.utils.parseUnits("2", 18),
      heartbeatSeconds: 3600,
      description: "Uniswap ETH/USD",
      decimals: 18
    },
    { 
      oracle: tellorEthUsd.address, 
      oracleType: 2, // Tellor
      weight: ethers.utils.parseUnits("2", 18),
      heartbeatSeconds: 3600,
      description: "Tellor ETH/USD",
      decimals: 18
    },
    { 
      oracle: api3EthUsd.address, 
      oracleType: 3, // API3
      weight: ethers.utils.parseUnits("1", 18),
      heartbeatSeconds: 3600,
      description: "API3 ETH/USD",
      decimals: 18
    }
  ];
  
  // 4. Deploy PriceAggregator
  console.log("\n=== Deploying PriceAggregator ===");
  
  const PriceAggregator = await ethers.getContractFactory("PriceAggregator");
  const priceAggregator = await PriceAggregator.deploy(
    ethUsdSources,
    oracleLib.address,
    twapCalculator.address
  );
  await priceAggregator.deployed();
  console.log("PriceAggregator deployed to:", priceAggregator.address);

  // 5. Configure BTC/USD sources and add as asset pair
  console.log("\n=== Adding BTC-USD Sources and Asset Pair ===");
  
  const btcUsdSources = [
    { 
      oracle: chainlinkBtcUsd.address, 
      oracleType: 0, // Chainlink
      weight: ethers.utils.parseUnits("3", 18),
      heartbeatSeconds: 3600,
      description: "Chainlink BTC/USD",
      decimals: 8
    },
    { 
      oracle: tellorBtcUsd.address, 
      oracleType: 2, // Tellor
      weight: ethers.utils.parseUnits("2", 18),
      heartbeatSeconds: 3600,
      description: "Tellor BTC/USD",
      decimals: 18
    }
  ];
  
  // Add BTC/USD sources
  for (const source of btcUsdSources) {
    console.log(`Adding source: ${source.description}`);
    await priceAggregator.addOracleSource(source);
  }
  
  // Add asset pairs
  console.log("Adding ETH-USD pair");
  await priceAggregator.addAssetPair(
    "ETH-USD",
    "ETH", 
    "USD",
    ethUsdSources.map(s => s.oracle)
  );
  
  console.log("Adding BTC-USD pair");
  await priceAggregator.addAssetPair(
    "BTC-USD",
    "BTC",
    "USD",
    btcUsdSources.map(s => s.oracle)
  );

  // 6. Test fetching prices
  console.log("\n=== Testing Price Fetching ===");
  
  // Get ETH-USD price
  const ethUsdMedian = await priceAggregator.getMedianPrice("ETH-USD");
  console.log("ETH-USD Median Price:", ethers.utils.formatUnits(ethUsdMedian, 18));
  
  const ethUsdWeighted = await priceAggregator.getWeightedPrice("ETH-USD");
  console.log("ETH-USD Weighted Price:", ethers.utils.formatUnits(ethUsdWeighted, 18));
  
  // Get BTC-USD price
  const btcUsdMedian = await priceAggregator.getMedianPrice("BTC-USD");
  console.log("BTC-USD Median Price:", ethers.utils.formatUnits(btcUsdMedian, 18));
  
  const btcUsdWeighted = await priceAggregator.getWeightedPrice("BTC-USD");
  console.log("BTC-USD Weighted Price:", ethers.utils.formatUnits(btcUsdWeighted, 18));

  // 7. Get all price data for ETH-USD to validate the solution
  console.log("\n=== Getting Detailed ETH-USD Price Data ===");
  
  const [prices, sourceTypes, descriptions, timestamps] = await priceAggregator.getAllPrices("ETH-USD");
  
  console.log("ETH-USD prices from all sources:");
  for (let i = 0; i < prices.length; i++) {
    console.log(` • ${descriptions[i]}: $${ethers.utils.formatUnits(prices[i], 18)} (type: ${sourceTypes[i]})`);
  }

  console.log("\n=== Deployment and Testing Complete ===");
  console.log(`
Local Deployment Summary:
------------------------
PriceAggregator: ${priceAggregator.address}
OracleLib: ${oracleLib.address}
TWAPCalculator: ${twapCalculator.address}

Mock Oracles:
- Chainlink ETH/USD: ${chainlinkEthUsd.address}
- Chainlink BTC/USD: ${chainlinkBtcUsd.address}
- Tellor ETH/USD: ${tellorEthUsd.address}
- Tellor BTC/USD: ${tellorBtcUsd.address}
- Uniswap Mock: ${uniswapMock.address}
- API3 ETH/USD: ${api3EthUsd.address}

Supported Pairs:
- ETH-USD (4 sources)
- BTC-USD (2 sources)
  `);
  
  // Return all deployed contracts for testing if needed
  return {
    priceAggregator,
    oracleLib,
    twapCalculator,
    mocks: {
      chainlinkEthUsd,
      chainlinkBtcUsd,
      tellorEthUsd,
      tellorBtcUsd,
      uniswapMock,
      api3EthUsd
    }
  };
}

// Execute the deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;