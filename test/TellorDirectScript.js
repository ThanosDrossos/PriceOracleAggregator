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
  console.log("🔗 Connecting to Tellor on Sepolia...");
  
  // Get the network information
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Connected to network: ${network.name} (chainId: ${network.chainId})`);
  
  // Connect directly to Tellor contract using ITellor interface
  // We need to use the actual function names from the Tellor protocol
  const tellor = await ethers.getContractAt([
    "function getDataBefore(bytes32 _queryId, uint256 _timestamp) external view returns (bytes memory _value, uint256 _timestampRetrieved)",
    "function retrieveData(bytes32 _queryId, uint256 _timestamp) external view returns (bytes memory)",
    "function getNewValueCountbyQueryId(bytes32 _queryId) external view returns (uint256)",
    "function getTimestampbyQueryIdandIndex(bytes32 _queryId, uint256 _index) external view returns (uint256)",
    "function getReporterByTimestamp(bytes32 _queryId, uint256 _timestamp) external view returns (address)",
    "function isInDispute(bytes32 _queryId, uint256 _timestamp) external view returns (bool)",
    "function getMultipleValuesBefore(bytes32 _queryId, uint256 _timestamp, uint256 _maxAge, uint256 _maxCount) external view returns (bytes[] memory _values, uint256[] memory _timestamps)"
  ], tellorContract);
  
  console.log(`✅ Connected to Tellor at ${tellorContract}`);
  
  // Test 1: Get latest ETH/USD price using getDataBefore
  console.log("\n🧪 Test 1: Latest ETH/USD Price");
  try {
    // Get the latest data before current timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const [ethUsdValue, timestamp] = await tellor.getDataBefore(tellorQueryETHUSD, currentTimestamp);
    
    if (timestamp > 0) {
      // Decode the bytes data to get the price
      const decodedValue = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], ethUsdValue)[0];
      const price = ethers.formatUnits(decodedValue, 18);
      console.log(`📊 ETH/USD Price: $${price}`);
      
      const date = new Date(Number(timestamp) * 1000);
      console.log(`⏰ Last updated: ${date.toLocaleString()}`);
      
      // Check data age
      const age = currentTimestamp - Number(timestamp);
      const ageHours = (age / 3600).toFixed(2);
      console.log(`📅 Data age: ${age} seconds (${ageHours} hours)`);
      
      if (age > 86400) { // 24 hours
        console.log("⚠️  Warning: Data is more than 24 hours old");
      }
    } else {
      console.log("❌ No ETH/USD data found");
    }
  } catch (error) {
    console.error("❌ Error getting latest ETH/USD price:", error.message);
  }
  
  // Test 2: Get BTC/USD price
  console.log("\n🧪 Test 2: Latest BTC/USD Price");
  try {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const [btcUsdValue, timestamp] = await tellor.getDataBefore(tellorQueryBTCUSD, currentTimestamp);
    
    if (timestamp > 0) {
      const decodedValue = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], btcUsdValue)[0];
      const price = ethers.formatUnits(decodedValue, 18);
      console.log(`₿ BTC/USD Price: $${price}`);
      
      const date = new Date(Number(timestamp) * 1000);
      console.log(`⏰ Last updated: ${date.toLocaleString()}`);
    } else {
      console.log("❌ No BTC/USD data found");
    }
  } catch (error) {
    console.error("❌ Error getting BTC/USD price:", error.message);
  }
  
  // Test 3: Get data analytics
  console.log("\n🧪 Test 3: ETH/USD Analytics");
  try {
    const valueCount = await tellor.getNewValueCountbyQueryId(tellorQueryETHUSD);
    console.log(`📊 Total ETH/USD submissions: ${valueCount.toString()}`);
    
    // Get latest timestamp and reporter
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const [, latestTimestamp] = await tellor.getDataBefore(tellorQueryETHUSD, currentTimestamp);
    
    if (latestTimestamp > 0) {
      const reporter = await tellor.getReporterByTimestamp(tellorQueryETHUSD, latestTimestamp);
      console.log(`👤 Latest reporter: ${reporter}`);
      
      // Check if disputed
      const isDisputed = await tellor.isInDispute(tellorQueryETHUSD, latestTimestamp);
      console.log(`⚖️  Is disputed: ${isDisputed ? "Yes" : "No"}`);
      
      // Get timestamp by index (most recent)
      if (valueCount > 0) {
        const lastIndex = valueCount - 1n;
        const indexTimestamp = await tellor.getTimestampbyQueryIdandIndex(tellorQueryETHUSD, lastIndex);
        const indexDate = new Date(Number(indexTimestamp) * 1000);
        console.log(`📅 Most recent submission (index ${lastIndex}): ${indexDate.toLocaleString()}`);
      }
    }
  } catch (error) {
    console.error("❌ Error getting analytics:", error.message);
  }
  
  // Test 4: Test with newly deployed TellorAdapter
  console.log("\n🧪 Test 4: Enhanced TellorAdapter Test");
  try {
    // Use the newly deployed enhanced adapter from the previous test
    const enhancedAdapterAddress = "0x771C2D34CCC49944b1B856Aa933EE47586DB2Da7";
    const adapter = await ethers.getContractAt("TellorAdapter", enhancedAdapterAddress);
    console.log(`🔗 Connected to Enhanced TellorAdapter at ${enhancedAdapterAddress}`);
    
    // Test the retrieveData function (should work even with stale data)
    try {
      const adapterPrice = await adapter.retrieveData();
      if (adapterPrice > 0) {
        console.log(`📊 TellorAdapter price: $${ethers.formatUnits(adapterPrice, 18)}`);
      } else {
        console.log("⚠️  TellorAdapter returned 0 (no data or filtered out disputed data)");
      }
    } catch (e) {
      console.log("❌ TellorAdapter retrieveData failed:", e.message);
    }
    
    // Test enhanced functions
    try {
      // This might fail due to stale data, but let's try with a longer age window
      const oneWeek = 7 * 24 * 3600; // 1 week
      const [value, timestamp] = await adapter.getLatestValueWithAge(oneWeek);
      
      if (timestamp > 0) {
        console.log(`📊 Enhanced adapter price (1 week window): $${ethers.formatUnits(value, 18)}`);
        const date = new Date(Number(timestamp) * 1000);
        console.log(`⏰ Timestamp: ${date.toLocaleString()}`);
      }
    } catch (e) {
      console.log("❌ Enhanced function failed:", e.message);
    }
    
    // Test analytics functions
    try {
      const totalValues = await adapter.getValueCount();
      console.log(`📊 Total values in adapter: ${totalValues.toString()}`);
      
      const lastTimestamp = await adapter.getLastUpdateTimestamp();
      if (lastTimestamp > 0) {
        const lastDate = new Date(Number(lastTimestamp) * 1000);
        console.log(`⏰ Last update: ${lastDate.toLocaleString()}`);
      }
    } catch (e) {
      console.log("❌ Analytics functions failed:", e.message);
    }
    
  } catch (error) {
    console.error("❌ Error testing enhanced TellorAdapter:", error.message);
  }
  
  console.log("\n🎉 Tellor direct testing completed!");
  console.log("📋 Summary:");
  console.log("   - Tested direct Tellor contract interaction");
  console.log("   - Retrieved latest ETH/USD and BTC/USD prices");
  console.log("   - Analyzed submission data and reporters");
  console.log("   - Compared with TellorAdapter functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
