const fs = require("fs");
const path = require("path");

/**
 * Updates the README.md file with actual deployed contract addresses
 * Run this after successful deployment to replace placeholder addresses
 */
async function updateReadmeWithDeployedAddresses() {
  console.log("📝 Updating README.md with deployed contract addresses...");
  
  // Read the deployment file
  const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found at deployments/sepolia.json");
    console.log("💡 Run the deployment script first: npx hardhat run scripts/deploy.js --network sepolia");
    process.exit(1);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contracts = deploymentData.contracts;
  
  console.log("📋 Found deployed contracts:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`  ${name}: ${address}`);
  });
  
  // Read the current README.md
  const readmePath = path.join(__dirname, "..", "README.md");
  let readmeContent = fs.readFileSync(readmePath, "utf8");
  
  // Replace the placeholder addresses in the deployment table
  const addressMappings = {
    'PriceAggregator': contracts.PriceAggregator,
    'OracleLib': contracts.OracleLib,
    'TWAPCalculator': contracts.TWAPCalculator,
    'UniswapV3GraphAdapter': contracts.UniswapV3GraphAdapter,
    'API3Adapter (ETH-USD)': contracts.API3Adapter_ETH_USD,
    'TellorAdapter (ETH-USD)': contracts.TellorAdapter_ETH_USD,
    'TellorAdapter (BTC-USD)': contracts.TellorAdapter_BTC_USD,
    'TellorAdapter (LINK-USD)': contracts.TellorAdapter_LINK_USD
  };
  
  // Update the deployment table
  console.log("🔄 Updating deployment addresses table...");
  Object.entries(addressMappings).forEach(([contractName, address]) => {
    // Replace the placeholder addresses in the table
    const placeholderPattern = new RegExp(`(\\| ${contractName.replace(/[()]/g, '\\$&')}\\s+\\| )\`0x[A-Fa-f0-9]+\``, 'g');
    readmeContent = readmeContent.replace(placeholderPattern, `$1\`${address}\``);
  });
  
  // Update example addresses in code blocks
  console.log("🔄 Updating example addresses in code blocks...");
  
  // Replace the main contract address in examples
  const mainContractPattern = /0x8C69A0A7D8A7A7B7A7B7A7B7A7B7A7B7A7B7A7B/g;
  readmeContent = readmeContent.replace(mainContractPattern, contracts.PriceAggregator);
  
  // Replace other placeholder addresses
  const tellorAdapterPattern = /0x\[DEPLOYED_TELLOR_ADAPTER_ADDRESS\]/g;
  readmeContent = readmeContent.replace(tellorAdapterPattern, contracts.TellorAdapter_ETH_USD);
  
  const newOraclePattern = /0x\[NEW_ORACLE_ADDRESS\]/g;
  readmeContent = readmeContent.replace(newOraclePattern, '0x[YOUR_NEW_ORACLE_ADDRESS]');
  
  // Add deployment information section
  const deploymentInfo = `
## Latest Deployment Information

**Deployment Date**: ${new Date(deploymentData.timestamp).toLocaleString()}  
**Network**: ${deploymentData.network} (Chain ID: ${deploymentData.chainId})  
**Deployer**: ${deploymentData.deployer}  
**Etherscan**: [View on Etherscan](${deploymentData.verification.etherscan})

### Contract Addresses

All contracts have been deployed and verified on Sepolia testnet:

| Contract | Address | Purpose |
|----------|---------|---------|
| **PriceAggregator** | [\`${contracts.PriceAggregator}\`](https://sepolia.etherscan.io/address/${contracts.PriceAggregator}) | Main aggregator contract |
| **OracleLib** | [\`${contracts.OracleLib}\`](https://sepolia.etherscan.io/address/${contracts.OracleLib}) | Oracle utility functions |
| **TWAPCalculator** | [\`${contracts.TWAPCalculator}\`](https://sepolia.etherscan.io/address/${contracts.TWAPCalculator}) | Time-weighted average calculations |
| **UniswapV3GraphAdapter** | [\`${contracts.UniswapV3GraphAdapter}\`](https://sepolia.etherscan.io/address/${contracts.UniswapV3GraphAdapter}) | Uniswap V3 price adapter |
| **API3Adapter (ETH/USD)** | [\`${contracts.API3Adapter_ETH_USD}\`](https://sepolia.etherscan.io/address/${contracts.API3Adapter_ETH_USD}) | API3 price feed adapter |
| **TellorAdapter (ETH/USD)** | [\`${contracts.TellorAdapter_ETH_USD}\`](https://sepolia.etherscan.io/address/${contracts.TellorAdapter_ETH_USD}) | Tellor ETH/USD adapter |
| **TellorAdapter (BTC/USD)** | [\`${contracts.TellorAdapter_BTC_USD}\`](https://sepolia.etherscan.io/address/${contracts.TellorAdapter_BTC_USD}) | Tellor BTC/USD adapter |
| **TellorAdapter (LINK/USD)** | [\`${contracts.TellorAdapter_LINK_USD}\`](https://sepolia.etherscan.io/address/${contracts.TellorAdapter_LINK_USD}) | Tellor LINK/USD adapter |

### Quick Test Commands

\`\`\`bash
# Test the deployed contracts
npx hardhat test test/PriceAggregator.sepolia.test.js --network sepolia

# Update Uniswap prices
export UNISWAP_ADAPTER_ADDRESS=${contracts.UniswapV3GraphAdapter}
npx hardhat run scripts/updateUniswapPrices.js --network sepolia

# Get current ETH price
npx hardhat run --network sepolia -e "
const aggregator = await ethers.getContractAt('PriceAggregator', '${contracts.PriceAggregator}');
const [median, weighted] = await aggregator.getAggregatedPrice('ETH-USD');
console.log('ETH/USD Median:', ethers.formatUnits(median, 18));
console.log('ETH/USD Weighted:', ethers.formatUnits(weighted, 18));
"
\`\`\`

`;
  
  // Insert the deployment information after the "Deployed Contracts" section
  const deployedContractsIndex = readmeContent.indexOf('## Quick Start');
  if (deployedContractsIndex !== -1) {
    readmeContent = readmeContent.slice(0, deployedContractsIndex) + 
                   deploymentInfo + 
                   readmeContent.slice(deployedContractsIndex);
  }
  
  // Update the note about replacing addresses
  readmeContent = readmeContent.replace(
    /> \*\*Note\*\*: Replace the addresses above with actual deployed addresses after running the deployment script\. All contracts are verified on Sepolia Etherscan\./g,
    `> ✅ **Addresses Updated**: All addresses below reflect the actual deployed contracts on Sepolia testnet as of ${new Date(deploymentData.timestamp).toLocaleDateString()}. All contracts are verified on Etherscan.`
  );
  
  // Write the updated README
  fs.writeFileSync(readmePath, readmeContent);
  
  console.log("✅ README.md updated successfully!");
  console.log("");
  console.log("📋 Summary of updates:");
  console.log("  ✅ Deployment addresses table updated");
  console.log("  ✅ Example code addresses updated");
  console.log("  ✅ Added latest deployment information section");
  console.log("  ✅ Added quick test commands");
  console.log("");
  console.log("🔗 Main contract:", contracts.PriceAggregator);
  console.log("🌐 Etherscan:", deploymentData.verification.etherscan);
}

// Execute if run directly
if (require.main === module) {
  updateReadmeWithDeployedAddresses()
    .then(() => {
      console.log("✅ README update completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to update README:", error.message);
      process.exit(1);
    });
}

module.exports = updateReadmeWithDeployedAddresses;