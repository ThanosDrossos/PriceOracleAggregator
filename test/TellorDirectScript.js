// Run this with: npx hardhat run test/TellorDirectScript.js --network sepolia

const { ethers } = require("hardhat");

// import addresses form address file
const {tellorContract,
    tellorAdapterContract,
    tellorQueryETHUSD,
    tellorQueryUNIUSD,
    tellorQueryLINKUSD,
    tellorQueryBTCUSD,
    tellorToken,
    tellorOracle} = require('../scripts/addresses');

async function main() {
  console.log("Connecting to Tellor on Sepolia...");
  
  // Get the network information
  const network = await ethers.provider.getNetwork();
  console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
  
  // Connect to Tellor contract
  const tellor = await ethers.getContractAt("ITellor", tellorContract);
  console.log(`Connected to Tellor at ${tellorContract}`);
  
  // Get ETH/USD price
  try {
    const ethUsdPrice = await tellor.getCurrentValue(tellorQueryETHUSD);
    console.log(`ETH/USD Price: ${ethers.utils.formatUnits(ethUsdPrice, 18)} USD`);
    
    // Get the timestamp of the last reported value
    const timestamp = await tellor.getTimestampByQueryIdandIndex(tellorQueryETHUSD, 0);
    const date = new Date(timestamp.toNumber() * 1000);
    console.log(`Last updated: ${date.toLocaleString()}`);
  } catch (error) {
    console.error("Error getting ETH/USD price:", error.message);
  }
  
  // Get BTC/USD price
  try {
    const btcUsdPrice = await tellor.getCurrentValue(tellorQueryETHUSD);
    console.log(`BTC/USD Price: ${ethers.utils.formatUnits(btcUsdPrice, 18)} USD`);
  } catch (error) {
    console.error("Error getting BTC/USD price:", error.message);
  }
  
  /*

  // Deploy a TellorAdapter to test it works
  try {
    const TellorAdapter = await ethers.getContractFactory("TellorAdapter");
    const adapter = await TellorAdapter.deploy(
      TELLOR_ADDRESS_SEPOLIA,
      "eth", // asset
      "usd"  // currency
    );
    await adapter.deployed();
    console.log(`TellorAdapter deployed at ${adapter.address}`);
    
    const price = await adapter.getLatestValue();
    console.log(`Price via adapter: ${price}`);
  } catch (error) {
    console.error("Error deploying or using TellorAdapter:", error.message);
  }
  */
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
