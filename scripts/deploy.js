const hre = require("hardhat");
const { ethers } = require("hardhat");
const addresses = require("./addresses");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Deploy utility contracts first
  console.log("Deploying OracleLib...");
  const OracleLib = await hre.ethers.getContractFactory("OracleLib");
  const oracleLib = await OracleLib.deploy();
  await oracleLib.deploymentTransaction().wait(1);
  console.log("OracleLib deployed to:", await oracleLib.getAddress());
  
  console.log("Deploying TWAPCalculator...");
  const TWAPCalculator = await hre.ethers.getContractFactory("TWAPCalculator");
  const twapCalculator = await TWAPCalculator.deploy();
  await twapCalculator.deploymentTransaction().wait(1);
  console.log("TWAPCalculator deployed to:", await twapCalculator.getAddress());
  
  // Deploy Tellor adapters for real Tellor oracle (not mocks)
  console.log("Deploying Tellor Adapters...");
  
  const TellorAdapter = await hre.ethers.getContractFactory("TellorAdapter");
  
  const tellorEthUsdAdapter = await TellorAdapter.deploy(
    addresses.tellorContract,
    addresses.tellorQueryETHUSD
  );
  await tellorEthUsdAdapter.deploymentTransaction().wait(1);
  console.log("Tellor ETH-USD Adapter deployed to:", await tellorEthUsdAdapter.getAddress());
  
  const tellorBtcUsdAdapter = await TellorAdapter.deploy(
    addresses.tellorContract,
    addresses.tellorQueryBTCUSD
  );
  await tellorBtcUsdAdapter.deploymentTransaction().wait(1);
  console.log("Tellor BTC-USD Adapter deployed to:", await tellorBtcUsdAdapter.getAddress());
  
  const tellorLinkUsdAdapter = await TellorAdapter.deploy(
    addresses.tellorContract,
    addresses.tellorQueryLINKUSD
  );
  await tellorLinkUsdAdapter.deploymentTransaction().wait(1);
  console.log("Tellor LINK-USD Adapter deployed to:", await tellorLinkUsdAdapter.getAddress());
  
  // Deploy API3 adapter for ETH/USD
  console.log("Deploying API3 adapter for ETH/USD...");
  const API3Adapter = await hre.ethers.getContractFactory("API3Adapter");
  const api3EthUsdAdapter = await API3Adapter.deploy(
    addresses.API3ProxyAddressETHUSD,
    addresses.API3DataFeedIdETHUSD
  );
  await api3EthUsdAdapter.deploymentTransaction().wait(1);
  console.log("API3 ETH-USD Adapter deployed to:", await api3EthUsdAdapter.getAddress());
  
  // Deploy UniswapV3GraphAdapter
  console.log("Deploying UniswapV3GraphAdapter...");
  const UniswapV3GraphAdapter = await hre.ethers.getContractFactory("UniswapV3GraphAdapter");
  const uniswapV3GraphAdapter = await UniswapV3GraphAdapter.deploy();
  await uniswapV3GraphAdapter.deploymentTransaction().wait(1);
  console.log("UniswapV3GraphAdapter deployed to:", await uniswapV3GraphAdapter.getAddress());
  
  // Update environment with the adapter address for the update script to use
  console.log(`\nTo use the price update script, run:\nexport UNISWAP_ADAPTER_ADDRESS=${await uniswapV3GraphAdapter.getAddress()}\nnpx hardhat run scripts/updateUniswapPrices.js --network sepolia`);
  
  // Configure oracle sources
  console.log("Setting up oracle sources...");
  
  // ETH-USD sources
  const ethUsdSources = [
    { 
      oracle: addresses.chainlinkETHUSD, 
      oracleType: 0, // Chainlink
      weight: 3,     // Highest weight for Chainlink
      heartbeatSeconds: 3600,
      description: "Chainlink ETH/USD",
      decimals: 8
    },
    { 
      oracle: await uniswapV3GraphAdapter.getAddress(), 
      oracleType: 1, // Uniswap
      weight: 2,
      heartbeatSeconds: 3600,
      description: "Uniswap ETH/USD",
      decimals: 18
    },
    { 
      oracle: await tellorEthUsdAdapter.getAddress(), 
      oracleType: 2, // Tellor
      weight: 2,
      heartbeatSeconds: 3600,
      description: "Tellor ETH/USD",
      decimals: 18
    },
    { 
      oracle: await api3EthUsdAdapter.getAddress(), 
      oracleType: 3, // API3
      weight: 1,
      heartbeatSeconds: 3600,
      description: "API3 ETH/USD",
      decimals: 18
    }
  ];
  
  // BTC-USD sources - using only Chainlink, Uniswap, and Tellor (no API3)
  const btcUsdSources = [
    { 
      oracle: addresses.chainlinkBTCUSD, 
      oracleType: 0, // Chainlink
      weight: 3,
      heartbeatSeconds: 3600,
      description: "Chainlink BTC/USD",
      decimals: 8
    },
    { 
      oracle: await uniswapV3GraphAdapter.getAddress(), 
      oracleType: 1, // Uniswap
      weight: 2,
      heartbeatSeconds: 3600,
      description: "Uniswap BTC/USD",
      decimals: 18
    },
    { 
      oracle: await tellorBtcUsdAdapter.getAddress(), 
      oracleType: 2, // Tellor
      weight: 2,
      heartbeatSeconds: 3600,
      description: "Tellor BTC/USD",
      decimals: 18
    }
  ];
  
  // LINK-USD sources - using only Chainlink, Uniswap, and Tellor (no API3)
  const linkUsdSources = [
    { 
      oracle: addresses.chainlinkLINKUSD, 
      oracleType: 0, // Chainlink
      weight: 3,
      heartbeatSeconds: 3600,
      description: "Chainlink LINK/USD",
      decimals: 8
    },
    { 
      oracle: await uniswapV3GraphAdapter.getAddress(), 
      oracleType: 1, // Uniswap
      weight: 2,
      heartbeatSeconds: 3600,
      description: "Uniswap LINK/USD",
      decimals: 18
    },
    { 
      oracle: await tellorLinkUsdAdapter.getAddress(), 
      oracleType: 2, // Tellor
      weight: 2,
      heartbeatSeconds: 3600,
      description: "Tellor LINK/USD",
      decimals: 18
    }
  ];
  
  // Deploy PriceAggregator with utility contracts
  console.log("Deploying PriceAggregator...");
  const PriceAggregator = await hre.ethers.getContractFactory("PriceAggregator");
  const priceAggregator = await PriceAggregator.deploy(
    ethUsdSources, // Start with just ETH-USD sources to avoid gas limit issues
    await oracleLib.getAddress(),
    await twapCalculator.getAddress()
  );
  await priceAggregator.deploymentTransaction().wait(1);
  console.log("PriceAggregator deployed to:", await priceAggregator.getAddress());
  
  // Add additional sources after deployment
  console.log("Adding BTC-USD sources...");
  for (const source of btcUsdSources) {
    // Skip if source already exists
    try {
      await priceAggregator.getSourceIndex(source.oracle);
      console.log(`Source ${source.oracle} already exists, skipping...`);
    } catch (error) {
      if (error.message.includes("Oracle not found")) {
        console.log(`Adding source ${source.description}...`);
        await priceAggregator.addOracleSource(source);
        console.log(`Added ${source.description}`);
      } else {
        throw error;
      }
    }
  }
  
  console.log("Adding LINK-USD sources...");
  for (const source of linkUsdSources) {
    // Skip if source already exists
    try {
      await priceAggregator.getSourceIndex(source.oracle);
      console.log(`Source ${source.oracle} already exists, skipping...`);
    } catch (error) {
      if (error.message.includes("Oracle not found")) {
        console.log(`Adding source ${source.description}...`);
        await priceAggregator.addOracleSource(source);
        console.log(`Added ${source.description}`);
      } else {
        throw error;
      }
    }
  }
  
  // Add asset pairs
  console.log("Adding asset pairs...");
  
  await priceAggregator.addAssetPair(
    "ETH-USD",
    "ETH",
    "USD",
    ethUsdSources.map(source => source.oracle)
  );
  console.log("ETH-USD pair added");
  
  await priceAggregator.addAssetPair(
    "BTC-USD",
    "BTC",
    "USD",
    btcUsdSources.map(source => source.oracle)
  );
  console.log("BTC-USD pair added");
  
  await priceAggregator.addAssetPair(
    "LINK-USD",
    "LINK",
    "USD",
    linkUsdSources.map(source => source.oracle)
  );
  console.log("LINK-USD pair added");
  
  console.log("Deployment complete!");
  
  // Save deployment addresses for later use
  console.log("\nDeployed contract addresses:");
  console.log("----------------------------");
  console.log("OracleLib:", await oracleLib.getAddress());
  console.log("TWAPCalculator:", await twapCalculator.getAddress());
  console.log("UniswapV3GraphAdapter:", await uniswapV3GraphAdapter.getAddress());
  console.log("PriceAggregator:", await priceAggregator.getAddress());
  console.log("API3Adapter (ETH-USD):", await api3EthUsdAdapter.getAddress());
  console.log("TellorAdapter (ETH-USD):", await tellorEthUsdAdapter.getAddress());
  console.log("TellorAdapter (BTC-USD):", await tellorBtcUsdAdapter.getAddress());
  console.log("TellorAdapter (LINK-USD):", await tellorLinkUsdAdapter.getAddress());
  
  // Update contract addresses in the addresses.js file
  console.log("\nUpdate your addresses.js file with these adapter addresses.");
  
  // Instructions for verification
  console.log("\nTo verify the contracts on Etherscan, run the following commands after deployment:");
  console.log(`npx hardhat verify --network sepolia ${await oracleLib.getAddress()}`);
  console.log(`npx hardhat verify --network sepolia ${await twapCalculator.getAddress()}`);
  console.log(`npx hardhat verify --network sepolia ${await uniswapV3GraphAdapter.getAddress()}`);
  console.log(`npx hardhat verify --network sepolia ${await api3EthUsdAdapter.getAddress()} ${addresses.API3ProxyAddressETHUSD} ${addresses.API3DataFeedIdETHUSD}`);
  console.log(`npx hardhat verify --network sepolia ${await tellorEthUsdAdapter.getAddress()} ${addresses.tellorContract} ${addresses.tellorQueryETHUSD}`);
  console.log(`npx hardhat verify --network sepolia ${await priceAggregator.getAddress()} "[${ethUsdSources.map(s => JSON.stringify(s)).join(',')}]" ${await oracleLib.getAddress()} ${await twapCalculator.getAddress()}`);
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });