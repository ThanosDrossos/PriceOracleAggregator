const { expect } = require("chai");
const { ethers } = require("hardhat");
const addresses = require("../scripts/addresses");

describe("Direct Oracle Tests - Real Sepolia Data", function () {
  this.timeout(300000); // 5 minutes
  
  let owner;
  let chainlinkEthUsdAdapter, chainlinkBtcUsdAdapter, chainlinkLinkUsdAdapter;
  
  before(async function () {
    console.log("🚀 Testing real Sepolia oracle data directly...");
    console.log("📡 No mocks - using live Chainlink endpoints");
    
    [owner] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("Network:", (await ethers.provider.getNetwork()).name);
    
    await deployAdapters();
    console.log("✅ All adapters deployed with real endpoints!\n");
  });
  
  async function deployAdapters() {
    console.log("🔌 Deploying adapters connected to real Sepolia oracles...");
    
    const ChainlinkAdapter = await ethers.getContractFactory("ChainlinkAdapter");
    
    // ETH/USD Chainlink
    chainlinkEthUsdAdapter = await ChainlinkAdapter.deploy(
      addresses.chainlinkETHUSD,
      "ETH",
      "USD",
      3600
    );
    await chainlinkEthUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Chainlink ETH/USD deployed:", await chainlinkEthUsdAdapter.getAddress());
    
    // BTC/USD Chainlink
    chainlinkBtcUsdAdapter = await ChainlinkAdapter.deploy(
      addresses.chainlinkBTCUSD,
      "BTC",
      "USD",
      3600
    );
    await chainlinkBtcUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Chainlink BTC/USD deployed:", await chainlinkBtcUsdAdapter.getAddress());
    
    // LINK/USD Chainlink
    chainlinkLinkUsdAdapter = await ChainlinkAdapter.deploy(
      addresses.chainlinkLINKUSD,
      "LINK",
      "USD",
      3600
    );
    await chainlinkLinkUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Chainlink LINK/USD deployed:", await chainlinkLinkUsdAdapter.getAddress());
  }
  
  describe("🎯 Live Price Data Tests", function () {
    
    it("Should get current ETH/USD price from Sepolia Chainlink", async function () {
      console.log("  📊 Getting live ETH/USD price...");
      
      const price = await chainlinkEthUsdAdapter.getLatestValue();
      const priceFloat = parseFloat(ethers.formatUnits(price, 8));
      
      console.log(`    💰 ETH/USD: $${priceFloat.toLocaleString()}`);
      
      expect(price).to.be.gt(0);
      expect(priceFloat).to.be.gt(1000).and.lt(10000);
      
      // Test data freshness
      const [isStale, age] = await chainlinkEthUsdAdapter.isDataStale();
      console.log(`    ⏰ Data age: ${Math.floor(Number(age) / 60)} minutes, stale: ${isStale}`);
      expect(isStale).to.be.false;
    });
    
    it("Should get current BTC/USD price from Sepolia Chainlink", async function () {
      console.log("  📊 Getting live BTC/USD price...");
      
      const price = await chainlinkBtcUsdAdapter.getLatestValue();
      const priceFloat = parseFloat(ethers.formatUnits(price, 8));
      
      console.log(`    💰 BTC/USD: $${priceFloat.toLocaleString()}`);
      
      expect(price).to.be.gt(0);
      expect(priceFloat).to.be.gt(20000).and.lt(200000);
    });
    
    it("Should get current LINK/USD price from Sepolia Chainlink", async function () {
      console.log("  📊 Getting live LINK/USD price...");
      
      const price = await chainlinkLinkUsdAdapter.getLatestValue();
      const priceFloat = parseFloat(ethers.formatUnits(price, 8));
      
      console.log(`    💰 LINK/USD: $${priceFloat.toLocaleString()}`);
      
      expect(price).to.be.gt(0);
      expect(priceFloat).to.be.gt(5).and.lt(100);
    });
    
    it("Should get historical data from Chainlink", async function () {
      console.log("  📊 Getting historical price data...");
      
      const [values, timestamps, roundIds] = await chainlinkEthUsdAdapter.getRecentValues(3);
      
      console.log(`    📈 Last 3 ETH/USD prices:`);
      for (let i = 0; i < values.length; i++) {
        const price = parseFloat(ethers.formatUnits(values[i], 8));
        const time = new Date(Number(timestamps[i]) * 1000).toLocaleString();
        console.log(`      • $${price.toLocaleString()} at ${time}`);
      }
      
      expect(values.length).to.be.gt(0);
      expect(values.length).to.be.lte(3);
    });
  });
  
  describe("🔧 Adapter Compatibility Tests", function () {
    
    it("Should work with PriceAggregator interface", async function () {
      console.log("  🔗 Testing PriceAggregator compatibility...");
      
      // Test the retrieveData method (legacy interface)
      const ethPrice = await chainlinkEthUsdAdapter.retrieveData();
      const btcPrice = await chainlinkBtcUsdAdapter.retrieveData();
      const linkPrice = await chainlinkLinkUsdAdapter.retrieveData();
      
      console.log(`    💰 Legacy interface prices:`);
      console.log(`      • ETH/USD: $${ethers.formatUnits(ethPrice, 8)}`);
      console.log(`      • BTC/USD: $${ethers.formatUnits(btcPrice, 8)}`);
      console.log(`      • LINK/USD: $${ethers.formatUnits(linkPrice, 8)}`);
      
      expect(ethPrice).to.be.gt(0);
      expect(btcPrice).to.be.gt(0);
      expect(linkPrice).to.be.gt(0);
    });
    
    it("Should provide detailed adapter information", async function () {
      console.log("  📋 Getting adapter metadata...");
      
      const [asset, currency, feedAddress, decimals, heartbeat, description] = 
        await chainlinkEthUsdAdapter.getAdapterInfo();
      
      console.log(`    📊 ETH/USD Adapter Info:`);
      console.log(`      • Description: ${description}`);
      console.log(`      • Feed Address: ${feedAddress}`);
      console.log(`      • Decimals: ${decimals}`);
      console.log(`      • Heartbeat: ${heartbeat} seconds`);
      
      expect(asset).to.equal("ETH");
      expect(currency).to.equal("USD");
      expect(feedAddress).to.equal(addresses.chainlinkETHUSD);
    });
  });
  
  describe("📊 Manual Price Aggregation", function () {
    
    it("Should manually aggregate prices from multiple sources", async function () {
      console.log("  🧮 Manually aggregating prices...");
      
      // Get prices from all adapters
      const ethPrice = await chainlinkEthUsdAdapter.getLatestValue();
      const btcPrice = await chainlinkBtcUsdAdapter.getLatestValue();
      const linkPrice = await chainlinkLinkUsdAdapter.getLatestValue();
      
      // Normalize to 18 decimals (from 8 decimals)
      const ethNormalized = ethPrice * BigInt(10 ** 10);
      const btcNormalized = btcPrice * BigInt(10 ** 10);
      const linkNormalized = linkPrice * BigInt(10 ** 10);
      
      console.log(`    💰 Normalized prices (18 decimals):`);
      console.log(`      • ETH/USD: ${ethers.formatUnits(ethNormalized, 18)}`);
      console.log(`      • BTC/USD: ${ethers.formatUnits(btcNormalized, 18)}`);
      console.log(`      • LINK/USD: ${ethers.formatUnits(linkNormalized, 18)}`);
      
      expect(ethNormalized).to.be.gt(0);
      expect(btcNormalized).to.be.gt(0);
      expect(linkNormalized).to.be.gt(0);
      
      // Test that BTC is more expensive than ETH
      expect(btcNormalized).to.be.gt(ethNormalized);
      console.log(`    ✅ BTC is more expensive than ETH ✓`);
      
      // Test that ETH is more expensive than LINK
      expect(ethNormalized).to.be.gt(linkNormalized);
      console.log(`    ✅ ETH is more expensive than LINK ✓`);
    });
  });
  
  describe("🌍 Real Network Validation", function () {
    
    it("Should validate we're on Sepolia testnet", async function () {
      const network = await ethers.provider.getNetwork();
      console.log(`    🌐 Connected to: ${network.name} (Chain ID: ${network.chainId})`);
      
      expect(network.name).to.equal("sepolia");
      expect(network.chainId).to.equal(11155111n);
    });
    
    it("Should confirm real oracle endpoints", async function () {
      console.log(`    📡 Confirming real oracle connections:`);
      console.log(`      • ETH/USD Chainlink: ${addresses.chainlinkETHUSD}`);
      console.log(`      • BTC/USD Chainlink: ${addresses.chainlinkBTCUSD}`);
      console.log(`      • LINK/USD Chainlink: ${addresses.chainlinkLINKUSD}`);
      
      // Verify these are not zero addresses
      expect(addresses.chainlinkETHUSD).to.not.equal(ethers.ZeroAddress);
      expect(addresses.chainlinkBTCUSD).to.not.equal(ethers.ZeroAddress);
      expect(addresses.chainlinkLINKUSD).to.not.equal(ethers.ZeroAddress);
    });
    
    it("Should get live timestamps from Sepolia", async function () {
      console.log(`    ⏰ Live timestamp analysis:`);
      
      const ethTimestamp = await chainlinkEthUsdAdapter.getLastUpdateTimestamp();
      const btcTimestamp = await chainlinkBtcUsdAdapter.getLastUpdateTimestamp();
      const linkTimestamp = await chainlinkLinkUsdAdapter.getLastUpdateTimestamp();
      
      const now = Math.floor(Date.now() / 1000);
      
      console.log(`      • ETH/USD last update: ${new Date(Number(ethTimestamp) * 1000).toLocaleString()}`);
      console.log(`      • BTC/USD last update: ${new Date(Number(btcTimestamp) * 1000).toLocaleString()}`);
      console.log(`      • LINK/USD last update: ${new Date(Number(linkTimestamp) * 1000).toLocaleString()}`);
      
      // All timestamps should be within the last 24 hours
      expect(Number(ethTimestamp)).to.be.gt(now - 86400);
      expect(Number(btcTimestamp)).to.be.gt(now - 86400);
      expect(Number(linkTimestamp)).to.be.gt(now - 86400);
      
      console.log(`    ✅ All data is recent (within 24 hours)`);
    });
  });
  
  after(async function () {
    console.log("\n🎉 Real Sepolia oracle tests completed!");
    console.log("📊 Summary:");
    console.log("  ✅ Live Chainlink ETH/USD data retrieved");
    console.log("  ✅ Live Chainlink BTC/USD data retrieved");
    console.log("  ✅ Live Chainlink LINK/USD data retrieved");
    console.log("  ✅ Historical data access working");
    console.log("  ✅ Adapter compatibility confirmed");
    console.log("  ✅ Manual price aggregation successful");
    console.log("  ✅ Real Sepolia network validation passed");
    console.log("\n🚀 Your adapters are successfully connected to real Sepolia oracles!");
    console.log("💡 No mocks used - all data is live from Chainlink on Sepolia testnet");
  });
});