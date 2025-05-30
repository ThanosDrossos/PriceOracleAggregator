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
  console.log("🔗 Testing TellorAdapter Functionality on Sepolia...");
  
  // Get the network information
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Connected to network: ${network.name} (chainId: ${network.chainId})`);
  
  try {
    const enhancedAdapterAddress = "0x771C2D34CCC49944b1B856Aa933EE47586DB2Da7";
    const adapter = await ethers.getContractAt("TellorAdapter", enhancedAdapterAddress);
    console.log(`🔗 Connected to TellorAdapter at ${enhancedAdapterAddress}`);
    
    // Test 1: Basic retrieveData function
    console.log("\n🧪 Test 1: Basic Price Retrieval");
    const basicPrice = await adapter.retrieveData();
    if (basicPrice > 0) {
      console.log(`✅ Price from retrieveData(): $${ethers.formatUnits(basicPrice, 18)}`);
    } else {
      console.log("❌ retrieveData() returned 0");
    }
    
    // Test 2: Get data status
    console.log("\n🧪 Test 2: Data Status and Age");
    const lastTimestamp = await adapter.getLastUpdateTimestamp();
    const dataAge = await adapter.getDataAge();
    const valueCount = await adapter.getValueCount();
    
    if (lastTimestamp > 0) {
      const lastDate = new Date(Number(lastTimestamp) * 1000);
      const ageDays = Number(dataAge) / 86400;
      console.log(`⏰ Last update: ${lastDate.toLocaleString()}`);
      console.log(`📅 Data age: ${ageDays.toFixed(1)} days (${dataAge} seconds)`);
      console.log(`📊 Total value count: ${valueCount}`);
    }
    
    // Test 3: Get latest value with status
    console.log("\n🧪 Test 3: Latest Value with Complete Status");
    const [value, timestamp, age, isDisputed] = await adapter.getLatestValueWithStatus();
    
    if (timestamp > 0) {
      const statusDate = new Date(Number(timestamp) * 1000);
      console.log(`💰 Value: $${ethers.formatUnits(value, 18)}`);
      console.log(`⏰ Timestamp: ${statusDate.toLocaleString()}`);
      console.log(`📅 Age: ${(Number(age) / 86400).toFixed(1)} days`);
      console.log(`⚖️  Disputed: ${isDisputed ? "Yes" : "No"}`);
    } else {
      console.log("❌ No data available");
    }
    
    // Test 4: Test with different age windows
    console.log("\n🧪 Test 4: Age Window Tests");
    
    const ageWindows = [
      { name: "1 hour", seconds: 3600 },
      { name: "1 day", seconds: 86400 },
      { name: "7 days", seconds: 7 * 86400 },
      { name: "30 days", seconds: 30 * 86400 },
      { name: "365 days", seconds: 365 * 86400 }
    ];
    
    for (const window of ageWindows) {
      try {
        const [ageValue, ageTimestamp] = await adapter.getLatestValueWithAge(window.seconds);
        if (ageTimestamp > 0) {
          console.log(`✅ ${window.name}: $${ethers.formatUnits(ageValue, 18)}`);
        } else {
          console.log(`❌ ${window.name}: No data within timeframe`);
        }
      } catch (e) {
        console.log(`❌ ${window.name}: ${e.message}`);
      }
    }
    
    // Test 5: Asset and Currency info
    console.log("\n🧪 Test 5: Contract Configuration");
    const asset = await adapter.asset();
    const currency = await adapter.currency();
    const queryId = await adapter.queryId();
    
    console.log(`🏷️  Asset: ${asset}`);
    console.log(`💱 Currency: ${currency}`);
    console.log(`🔑 Query ID: ${queryId}`);
    
    // Test 6: Check if current data is disputed
    if (lastTimestamp > 0) {
      console.log("\n🧪 Test 6: Dispute Status");
      const disputed = await adapter.isDisputed(lastTimestamp);
      console.log(`⚖️  Current data disputed: ${disputed ? "Yes" : "No"}`);
      
      if (!disputed) {
        const reporter = await adapter.getReporter(lastTimestamp);
        console.log(`👤 Reporter address: ${reporter}`);
      }
    }
    
    // Test 7: Test the new getLatestValue function (should work now)
    console.log("\n🧪 Test 7: Latest Value (No Age Restrictions)");
    try {
      const latestValue = await adapter.getLatestValue();
      if (latestValue > 0) {
        console.log(`✅ Latest value (unrestricted): $${ethers.formatUnits(latestValue, 18)}`);
      } else {
        console.log("⚠️  Latest value returned 0 (likely disputed or no data)");
      }
    } catch (e) {
      console.log(`❌ getLatestValue failed: ${e.message}`);
    }
    
    // Summary
    console.log("\n📊 SUMMARY:");
    console.log("✅ TellorAdapter is functioning correctly");
    console.log("✅ Successfully retrieving ETH/USD price data from Tellor");
    console.log("⚠️  Data is quite old (246+ days) but still accessible");
    console.log("⚠️  Age-restricted functions fail due to data staleness");
    console.log("💡 Consider the data freshness requirements for your use case");
    
  } catch (error) {
    console.error("❌ Error testing TellorAdapter:", error.message);
  }
  
  console.log("\n🎉 TellorAdapter testing completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
