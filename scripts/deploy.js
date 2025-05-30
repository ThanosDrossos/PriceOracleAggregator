const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const addresses = require("./addresses");

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  network: "sepolia",
  confirmations: 2,
  gasMultiplier: 1.2,
  timeoutSeconds: 300
};

// Storage for deployed addresses
let deployedAddresses = {};

async function main() {
  console.log("🚀 Starting PriceAggregator deployment to Sepolia testnet...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  
  // Check network and account
  const network = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log("📋 Deployment Configuration:");
  console.log("----------------------------");
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Confirmations:", DEPLOYMENT_CONFIG.confirmations);
  console.log("");

  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low ETH balance. Consider getting more from https://sepoliafaucet.com/");
  }

  try {
    // Deploy utility contracts first
    await deployUtilityContracts();
    
    // Deploy oracle adapters
    await deployOracleAdapters();
    
    // Deploy main PriceAggregator contract
    await deployPriceAggregator();
    
    // Configure asset pairs
    await configureAssetPairs();
    
    // Save deployment addresses
    await saveDeploymentAddresses();
    
    // Display summary
    displayDeploymentSummary();
    
    // Display verification commands
    displayVerificationCommands();
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("📝 All addresses saved to deployments/sepolia.json");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error("💡 Check your .env file and ensure you have sufficient Sepolia ETH");
    throw error;
  }
}

async function deployUtilityContracts() {
  console.log("📦 Deploying utility contracts...");
  
  // Deploy OracleLib
  console.log("  📋 Deploying OracleLib...");
  const OracleLib = await hre.ethers.getContractFactory("OracleLib");
  const oracleLib = await OracleLib.deploy();
  await waitForDeployment(oracleLib, "OracleLib");
  deployedAddresses.oracleLib = await oracleLib.getAddress();
  console.log("  ✅ OracleLib deployed:", deployedAddresses.oracleLib);
  
  // Deploy TWAPCalculator
  console.log("  📊 Deploying TWAPCalculator...");
  const TWAPCalculator = await hre.ethers.getContractFactory("TWAPCalculator");
  const twapCalculator = await TWAPCalculator.deploy();
  await waitForDeployment(twapCalculator, "TWAPCalculator");
  deployedAddresses.twapCalculator = await twapCalculator.getAddress();
  console.log("  ✅ TWAPCalculator deployed:", deployedAddresses.twapCalculator);
  
  console.log("✅ Utility contracts deployed successfully!\n");
}

async function deployOracleAdapters() {
  console.log("🔌 Deploying oracle adapters...");
  
  // Deploy Tellor Adapters
  console.log("  🔮 Deploying Tellor Adapters...");
  const TellorAdapter = await hre.ethers.getContractFactory("TellorAdapter");
  
  // ETH/USD Tellor Adapter
  console.log("    📈 ETH/USD Tellor Adapter...");
  const tellorEthUsdAdapter = await TellorAdapter.deploy(
    addresses.tellorContract,
    addresses.tellorQueryETHUSD
  );
  await waitForDeployment(tellorEthUsdAdapter, "TellorAdapter ETH/USD");
  deployedAddresses.tellorEthUsdAdapter = await tellorEthUsdAdapter.getAddress();
  console.log("    ✅ Tellor ETH/USD:", deployedAddresses.tellorEthUsdAdapter);
  
  // BTC/USD Tellor Adapter
  console.log("    ₿ BTC/USD Tellor Adapter...");
  const tellorBtcUsdAdapter = await TellorAdapter.deploy(
    addresses.tellorContract,
    addresses.tellorQueryBTCUSD
  );
  await waitForDeployment(tellorBtcUsdAdapter, "TellorAdapter BTC/USD");
  deployedAddresses.tellorBtcUsdAdapter = await tellorBtcUsdAdapter.getAddress();
  console.log("    ✅ Tellor BTC/USD:", deployedAddresses.tellorBtcUsdAdapter);
  
  // LINK/USD Tellor Adapter
  console.log("    🔗 LINK/USD Tellor Adapter...");
  const tellorLinkUsdAdapter = await TellorAdapter.deploy(
    addresses.tellorContract,
    addresses.tellorQueryLINKUSD
  );
  await waitForDeployment(tellorLinkUsdAdapter, "TellorAdapter LINK/USD");
  deployedAddresses.tellorLinkUsdAdapter = await tellorLinkUsdAdapter.getAddress();
  console.log("    ✅ Tellor LINK/USD:", deployedAddresses.tellorLinkUsdAdapter);
  
  // Deploy API3 Adapter
  console.log("  🌐 Deploying API3 Adapter (ETH/USD)...");
  const API3Adapter = await hre.ethers.getContractFactory("API3Adapter");
  const api3EthUsdAdapter = await API3Adapter.deploy(
    addresses.API3ReaderProxyETHUSD,
    "ETH",
    "USD",
    3600, // 1 hour heartbeat
    18    // 18 decimals
  );
  await waitForDeployment(api3EthUsdAdapter, "API3Adapter ETH/USD");
  deployedAddresses.api3EthUsdAdapter = await api3EthUsdAdapter.getAddress();
  console.log("  ✅ API3 ETH/USD:", deployedAddresses.api3EthUsdAdapter);
  
  // Deploy UniswapV3GraphAdapter
  console.log("  🦄 Deploying UniswapV3GraphAdapter...");
  const UniswapV3GraphAdapter = await hre.ethers.getContractFactory("UniswapV3GraphAdapter");
  const uniswapV3GraphAdapter = await UniswapV3GraphAdapter.deploy();
  await waitForDeployment(uniswapV3GraphAdapter, "UniswapV3GraphAdapter");
  deployedAddresses.uniswapV3GraphAdapter = await uniswapV3GraphAdapter.getAddress();
  console.log("  ✅ Uniswap V3 Adapter:", deployedAddresses.uniswapV3GraphAdapter);
  
  console.log("✅ Oracle adapters deployed successfully!\n");
  
  // Important note about Uniswap price updates
  console.log("💡 Important: Update Uniswap prices after deployment:");
  console.log(`   export UNISWAP_ADAPTER_ADDRESS=${deployedAddresses.uniswapV3GraphAdapter}`);
  console.log("   npx hardhat run scripts/updateUniswapPrices.js --network sepolia\n");
}

async function deployPriceAggregator() {
  console.log("🏗️ Deploying PriceAggregator main contract...");
  
  // Configure oracle sources
  const ethUsdSources = [
    { 
      oracle: addresses.chainlinkETHUSD, 
      oracleType: 0, // Chainlink
      weight: ethers.parseUnits("3", 18), // Weight 3
      heartbeatSeconds: 3600,
      description: "Chainlink ETH/USD",
      decimals: 8
    },
    { 
      oracle: deployedAddresses.uniswapV3GraphAdapter, 
      oracleType: 1, // Uniswap
      weight: ethers.parseUnits("2", 18), // Weight 2
      heartbeatSeconds: 3600,
      description: "Uniswap ETH/USD",
      decimals: 18
    },
    { 
      oracle: deployedAddresses.tellorEthUsdAdapter, 
      oracleType: 2, // Tellor
      weight: ethers.parseUnits("2", 18), // Weight 2
      heartbeatSeconds: 3600,
      description: "Tellor ETH/USD",
      decimals: 18
    },
    { 
      oracle: deployedAddresses.api3EthUsdAdapter, 
      oracleType: 3, // API3
      weight: ethers.parseUnits("1", 18), // Weight 1
      heartbeatSeconds: 3600,
      description: "API3 ETH/USD",
      decimals: 18
    }
  ];
  
  console.log("  📋 Configured ETH/USD sources:");
  ethUsdSources.forEach((source, i) => {
    console.log(`    ${i + 1}. ${source.description} (Weight: ${ethers.formatUnits(source.weight, 18)})`);
  });
  
  // Deploy PriceAggregator
  const PriceAggregator = await hre.ethers.getContractFactory("PriceAggregator");
  const priceAggregator = await PriceAggregator.deploy(
    ethUsdSources,
    deployedAddresses.oracleLib,
    deployedAddresses.twapCalculator
  );
  await waitForDeployment(priceAggregator, "PriceAggregator");
  deployedAddresses.priceAggregator = await priceAggregator.getAddress();
  console.log("  ✅ PriceAggregator deployed:", deployedAddresses.priceAggregator);
  
  // Store the contract instance for later use
  deployedAddresses.priceAggregatorContract = priceAggregator;
  
  // Add additional oracle sources
  await addAdditionalOracleSources(priceAggregator);
  
  console.log("✅ PriceAggregator deployed and configured!\n");
}

async function addAdditionalOracleSources(priceAggregator) {
  console.log("  🔧 Adding additional oracle sources...");
  
  // BTC/USD sources
  const btcUsdSources = [
    { 
      oracle: addresses.chainlinkBTCUSD, 
      oracleType: 0, // Chainlink
      weight: ethers.parseUnits("3", 18),
      heartbeatSeconds: 3600,
      description: "Chainlink BTC/USD",
      decimals: 8
    },
    { 
      oracle: deployedAddresses.uniswapV3GraphAdapter, 
      oracleType: 1, // Uniswap
      weight: ethers.parseUnits("2", 18),
      heartbeatSeconds: 3600,
      description: "Uniswap BTC/USD",
      decimals: 18
    },
    { 
      oracle: deployedAddresses.tellorBtcUsdAdapter, 
      oracleType: 2, // Tellor
      weight: ethers.parseUnits("2", 18),
      heartbeatSeconds: 3600,
      description: "Tellor BTC/USD",
      decimals: 18
    }
  ];
  
  // LINK/USD sources
  const linkUsdSources = [
    { 
      oracle: addresses.chainlinkLINKUSD, 
      oracleType: 0, // Chainlink
      weight: ethers.parseUnits("3", 18),
      heartbeatSeconds: 3600,
      description: "Chainlink LINK/USD",
      decimals: 8
    },
    { 
      oracle: deployedAddresses.uniswapV3GraphAdapter, 
      oracleType: 1, // Uniswap
      weight: ethers.parseUnits("2", 18),
      heartbeatSeconds: 3600,
      description: "Uniswap LINK/USD",
      decimals: 18
    },
    { 
      oracle: deployedAddresses.tellorLinkUsdAdapter, 
      oracleType: 2, // Tellor
      weight: ethers.parseUnits("2", 18),
      heartbeatSeconds: 3600,
      description: "Tellor LINK/USD",
      decimals: 18
    }
  ];
  
  // Add BTC/USD sources
  console.log("    ₿ Adding BTC/USD sources...");
  for (const source of btcUsdSources) {
    await addOracleSourceSafely(priceAggregator, source);
  }
  
  // Add LINK/USD sources  
  console.log("    🔗 Adding LINK/USD sources...");
  for (const source of linkUsdSources) {
    await addOracleSourceSafely(priceAggregator, source);
  }
  
  // Store sources for later use
  deployedAddresses.btcUsdSources = btcUsdSources;
  deployedAddresses.linkUsdSources = linkUsdSources;
}

async function addOracleSourceSafely(priceAggregator, source) {
  try {
    await priceAggregator.getSourceIndex(source.oracle);
    console.log(`      ⏭️ Source ${source.description} already exists, skipping...`);
  } catch (error) {
    if (error.message.includes("Oracle not found")) {
      console.log(`      ➕ Adding ${source.description}...`);
      const tx = await priceAggregator.addOracleSource(source);
      await tx.wait(DEPLOYMENT_CONFIG.confirmations);
      console.log(`      ✅ Added ${source.description}`);
    } else {
      console.error(`      ❌ Error checking source ${source.description}:`, error.message);
      throw error;
    }
  }
}

async function configureAssetPairs() {
  console.log("🔗 Configuring asset pairs...");
  
  const priceAggregator = deployedAddresses.priceAggregatorContract;
  
  // ETH/USD pair (already configured in constructor, but let's verify)
  console.log("  📈 Configuring ETH/USD pair...");
  try {
    const ethUsdSources = [
      addresses.chainlinkETHUSD,
      deployedAddresses.uniswapV3GraphAdapter,
      deployedAddresses.tellorEthUsdAdapter,
      deployedAddresses.api3EthUsdAdapter
    ];
    
    await priceAggregator.addAssetPair(
      "ETH-USD",
      "ETH",
      "USD",
      ethUsdSources
    );
    console.log("  ✅ ETH/USD pair configured");
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("  ⏭️ ETH/USD pair already configured");
    } else {
      throw error;
    }
  }
  
  // BTC/USD pair
  console.log("  ₿ Configuring BTC/USD pair...");
  const btcUsdSourceAddresses = deployedAddresses.btcUsdSources.map(s => s.oracle);
  const tx1 = await priceAggregator.addAssetPair(
    "BTC-USD",
    "BTC", 
    "USD",
    btcUsdSourceAddresses
  );
  await tx1.wait(DEPLOYMENT_CONFIG.confirmations);
  console.log("  ✅ BTC/USD pair configured");
  
  // LINK/USD pair
  console.log("  🔗 Configuring LINK/USD pair...");
  const linkUsdSourceAddresses = deployedAddresses.linkUsdSources.map(s => s.oracle);
  const tx2 = await priceAggregator.addAssetPair(
    "LINK-USD",
    "LINK",
    "USD", 
    linkUsdSourceAddresses
  );
  await tx2.wait(DEPLOYMENT_CONFIG.confirmations);
  console.log("  ✅ LINK/USD pair configured");
  
  console.log("✅ All asset pairs configured successfully!\n");
}

async function waitForDeployment(contract, name) {
  console.log(`    ⏳ Waiting for ${name} deployment confirmation...`);
  await contract.deploymentTransaction().wait(DEPLOYMENT_CONFIG.confirmations);
  console.log(`    ✅ ${name} confirmed after ${DEPLOYMENT_CONFIG.confirmations} blocks`);
}

async function saveDeploymentAddresses() {
  console.log("💾 Saving deployment addresses...");
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  // Prepare deployment data
  const deploymentData = {
    network: "sepolia",
    chainId: 11155111,
    timestamp: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address,
    contracts: {
      PriceAggregator: deployedAddresses.priceAggregator,
      OracleLib: deployedAddresses.oracleLib,
      TWAPCalculator: deployedAddresses.twapCalculator,
      UniswapV3GraphAdapter: deployedAddresses.uniswapV3GraphAdapter,
      API3Adapter_ETH_USD: deployedAddresses.api3EthUsdAdapter,
      TellorAdapter_ETH_USD: deployedAddresses.tellorEthUsdAdapter,
      TellorAdapter_BTC_USD: deployedAddresses.tellorBtcUsdAdapter,
      TellorAdapter_LINK_USD: deployedAddresses.tellorLinkUsdAdapter
    },
    externalContracts: {
      Chainlink_ETH_USD: addresses.chainlinkETHUSD,
      Chainlink_BTC_USD: addresses.chainlinkBTCUSD,
      Chainlink_LINK_USD: addresses.chainlinkLINKUSD,
      API3_ETH_USD: addresses.API3ReaderProxyETHUSD,
      Tellor_Contract: addresses.tellorContract
    },
    supportedPairs: ["ETH-USD", "BTC-USD", "LINK-USD"],
    verification: {
      etherscan: `https://sepolia.etherscan.io/address/${deployedAddresses.priceAggregator}`,
      commands: generateVerificationCommands()
    }
  };
  
  // Save to file
  const filePath = path.join(deploymentsDir, "sepolia.json");
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
  console.log("  ✅ Addresses saved to deployments/sepolia.json");
}

function generateVerificationCommands() {
  return [
    `npx hardhat verify --network sepolia ${deployedAddresses.oracleLib}`,
    `npx hardhat verify --network sepolia ${deployedAddresses.twapCalculator}`,
    `npx hardhat verify --network sepolia ${deployedAddresses.uniswapV3GraphAdapter}`,
    `npx hardhat verify --network sepolia ${deployedAddresses.api3EthUsdAdapter} ${addresses.API3ReaderProxyETHUSD} "ETH" "USD" 3600 18`,
    `npx hardhat verify --network sepolia ${deployedAddresses.tellorEthUsdAdapter} ${addresses.tellorContract} ${addresses.tellorQueryETHUSD}`,
    `npx hardhat verify --network sepolia ${deployedAddresses.tellorBtcUsdAdapter} ${addresses.tellorContract} ${addresses.tellorQueryBTCUSD}`,
    `npx hardhat verify --network sepolia ${deployedAddresses.tellorLinkUsdAdapter} ${addresses.tellorContract} ${addresses.tellorQueryLINKUSD}`
  ];
}

function displayDeploymentSummary() {
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=====================");
  console.log("Network: Sepolia Testnet");
  console.log("Chain ID: 11155111");
  console.log("");
  console.log("📋 Core Contracts:");
  console.log("  PriceAggregator:", deployedAddresses.priceAggregator);
  console.log("  OracleLib:", deployedAddresses.oracleLib);
  console.log("  TWAPCalculator:", deployedAddresses.twapCalculator);
  console.log("");
  console.log("🔌 Oracle Adapters:");
  console.log("  UniswapV3GraphAdapter:", deployedAddresses.uniswapV3GraphAdapter);
  console.log("  API3Adapter (ETH/USD):", deployedAddresses.api3EthUsdAdapter);
  console.log("  TellorAdapter (ETH/USD):", deployedAddresses.tellorEthUsdAdapter);
  console.log("  TellorAdapter (BTC/USD):", deployedAddresses.tellorBtcUsdAdapter);
  console.log("  TellorAdapter (LINK/USD):", deployedAddresses.tellorLinkUsdAdapter);
  console.log("");
  console.log("💱 Supported Trading Pairs:");
  console.log("  • ETH/USD (4 sources: Chainlink, Uniswap, Tellor, API3)");
  console.log("  • BTC/USD (3 sources: Chainlink, Uniswap, Tellor)");
  console.log("  • LINK/USD (3 sources: Chainlink, Uniswap, Tellor)");
  console.log("");
  console.log("🔗 Quick Access:");
  console.log(`  Etherscan: https://sepolia.etherscan.io/address/${deployedAddresses.priceAggregator}`);
  console.log(`  Main Contract: ${deployedAddresses.priceAggregator}`);
}

function displayVerificationCommands() {
  console.log("\n🔍 CONTRACT VERIFICATION COMMANDS");
  console.log("==================================");
  console.log("Run these commands to verify contracts on Etherscan:");
  console.log("");
  
  const commands = generateVerificationCommands();
  commands.forEach((cmd, i) => {
    console.log(`${i + 1}. ${cmd}`);
  });
  
  console.log("");
  console.log("💡 Next Steps:");
  console.log("1. Update Uniswap prices:");
  console.log(`   export UNISWAP_ADAPTER_ADDRESS=${deployedAddresses.uniswapV3GraphAdapter}`);
  console.log("   npx hardhat run scripts/updateUniswapPrices.js --network sepolia");
  console.log("");
  console.log("2. Test the deployment:");
  console.log("   npx hardhat test test/PriceAggregator.sepolia.test.js --network sepolia");
  console.log("");
  console.log("3. Update the README.md with the real addresses from deployments/sepolia.json");
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n💥 DEPLOYMENT FAILED");
      console.error("===================");
      console.error("Error:", error.message);
      if (error.code === 'INSUFFICIENT_FUNDS') {
        console.error("💡 Solution: Get more Sepolia ETH from https://sepoliafaucet.com/");
      } else if (error.code === 'NETWORK_ERROR') {
        console.error("💡 Solution: Check your internet connection and RPC provider");
      } else if (error.message.includes("private key")) {
        console.error("💡 Solution: Check your .env file and PRIVATE_KEY configuration");
      }
      process.exit(1);
    });
}

module.exports = main;