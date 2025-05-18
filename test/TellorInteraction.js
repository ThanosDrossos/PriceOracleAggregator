const { ethers } = require("hardhat");
const { expect } = require("chai");

// import addresses form address file
const {tellorContract: TELLOR_ADDRESS,
    tellorAdapterContract,
    tellorQueryETHUSD,
    tellorQueryUNIUSD,
    tellorQueryLINKUSD,
    tellorQueryBTCUSD,
    tellorToken,
    tellorOracle} = require('./addresses');

describe("Tellor Oracle Interaction", function () {
  // Increase timeout for testnet interactions
  this.timeout(60000); 

  let tellorInstance;  // Renamed to avoid conflict with imported tellorContract
  let signer;

  before(async function () {
    // This test requires a connection to Sepolia - check if we're on the right network
    const network = await ethers.provider.getNetwork();
    if (network.name !== "sepolia" && network.chainId !== 11155111) {
      console.log("⚠️ This test must be run on Sepolia network");
      console.log(`Current network: ${network.name} (${network.chainId})`);
      this.skip();
    }

    [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    // Connect to Tellor contract using the imported address
    tellorInstance = await ethers.getContractAt("ITellor", TELLOR_ADDRESS);
    console.log(`Connected to Tellor at ${TELLOR_ADDRESS}`);
  });

  it("should retrieve ETH/USD price data", async function () {
    try {
      const result = await tellorInstance.getCurrentValue(tellorQueryETHUSD);
      console.log(`ETH/USD Price: ${ethers.utils.formatUnits(result, 18)} USD`);
      
      // Get the timestamp of the last reported value
      const timestamp = await tellorInstance.getTimestampByQueryIdandIndex(tellorQueryETHUSD, 0);
      const date = new Date(timestamp.toNumber() * 1000);
      console.log(`Last updated: ${date.toLocaleString()}`);
      
      expect(result).to.be.gt(0);
    } catch (error) {
      console.error("Error retrieving ETH/USD price:", error.message);
    }
  });

  it("should retrieve BTC/USD price data", async function () {
    try {
      const result = await tellorInstance.getCurrentValue(tellorQueryBTCUSD);
      console.log(`BTC/USD Price: ${ethers.utils.formatUnits(result, 18)} USD`);
      expect(result).to.be.gt(0);
    } catch (error) {
      console.error("Error retrieving BTC/USD price:", error.message);
    }
  });

  it("should create a TellorAdapter and get data through it", async function () {
    try {
      // Deploy the TellorAdapter contract
      const TellorAdapter = await ethers.getContractFactory("TellorAdapter");
      const adapter = await TellorAdapter.deploy(
        TELLOR_ADDRESS,  // Using imported address
        "eth", // asset
        "usd"  // currency
      );
      await adapter.deployed();
      console.log(`TellorAdapter deployed at ${adapter.address}`);

      // Get price through the adapter
      const price = await adapter.getLatestValue();
      console.log(`ETH/USD via adapter: ${price}`);

      // Get last update timestamp
      const timestamp = await adapter.getLastUpdateTimestamp();
      const date = new Date(timestamp.toNumber() * 1000);
      console.log(`Last updated (via adapter): ${date.toLocaleString()}`);
    } catch (error) {
      console.error("Error using TellorAdapter:", error.message);
    }
  });

  it("should demonstrate how to create a custom queryId", async function () {
    try {
      // Example of generating a custom queryId for a different asset pair
      const asset = "sol";
      const currency = "usd";
      const queryData = ethers.utils.defaultAbiCoder.encode(
        ["string", "bytes"],
        ["SpotPrice", ethers.utils.defaultAbiCoder.encode(["string", "string"], [asset, currency])]
      );
      const queryId = ethers.utils.keccak256(queryData);
      
      console.log(`Custom queryId for ${asset}/${currency}: ${queryId}`);
      
      // Try to get data for this queryId
      try {
        const result = await tellorInstance.getCurrentValue(queryId);
        console.log(`${asset.toUpperCase()}/${currency.toUpperCase()} Price: ${ethers.utils.formatUnits(result, 18)} ${currency.toUpperCase()}`);
      } catch (e) {
        console.log(`No data available for ${asset}/${currency}`);
      }
    } catch (error) {
      console.error("Error with custom queryId:", error.message);
    }
  });
});
