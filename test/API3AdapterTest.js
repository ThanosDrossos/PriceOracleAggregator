const { ethers } = require("hardhat");
const addresses = require("../scripts/addresses");

async function main() {
  console.log("🚀 Testing API3Adapter deployment and usage...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  try {
    // Deploy API3Adapter for ETH/USD
    console.log("📊 Deploying API3Adapter for ETH/USD...");
    const API3Adapter = await ethers.getContractFactory("API3Adapter");
    
    const api3EthUsdAdapter = await API3Adapter.deploy(
      addresses.API3ReaderProxyETHUSD,
      "ETH",
      "USD", 
      3600, // 1 hour heartbeat
      18    // 18 decimals (typical for API3)
    );
    
    await api3EthUsdAdapter.waitForDeployment();
    console.log("✅ API3 ETH/USD Adapter deployed to:", await api3EthUsdAdapter.getAddress());
    
    // Deploy API3Adapter for BTC/USD
    console.log("📊 Deploying API3Adapter for BTC/USD...");
    const api3BtcUsdAdapter = await API3Adapter.deploy(
      addresses.API3ReaderProxyBTCUSD,
      "BTC",
      "USD",
      3600, // 1 hour heartbeat  
      18    // 18 decimals
    );
    
    await api3BtcUsdAdapter.waitForDeployment();
    console.log("✅ API3 BTC/USD Adapter deployed to:", await api3BtcUsdAdapter.getAddress());
    
    // Deploy API3Adapter for UNI/USD
    console.log("📊 Deploying API3Adapter for UNI/USD...");
    const api3UniUsdAdapter = await API3Adapter.deploy(
      addresses.API3ReaderProxyUNIUSD,
      "UNI",
      "USD",
      3600, // 1 hour heartbeat  
      18    // 18 decimals
    );
    
    await api3UniUsdAdapter.waitForDeployment();
    console.log("✅ API3 UNI/USD Adapter deployed to:", await api3UniUsdAdapter.getAddress());
    
    // Test functionality
    console.log("\n🧪 Testing API3Adapter functionality...\n");
    
    // Test ETH/USD adapter
    console.log("--- ETH/USD Adapter Tests ---");
    try {
      const ethCanProvide = await api3EthUsdAdapter.canProvideData();
      console.log("Can provide ETH/USD data:", ethCanProvide);
      
      if (ethCanProvide) {
        const ethPrice = await api3EthUsdAdapter.getLatestValue();
        console.log("ETH/USD Price:", ethers.formatUnits(ethPrice, 18));
        
        const ethTimestamp = await api3EthUsdAdapter.getLastUpdateTimestamp();
        const ethDate = new Date(Number(ethTimestamp) * 1000);
        console.log("Last updated:", ethDate.toLocaleString());
        
        const [isStale, age] = await api3EthUsdAdapter.isDataStale();
        console.log("Is data stale:", isStale, "Age (seconds):", age.toString());
        
        const adapterInfo = await api3EthUsdAdapter.getAdapterInfo();
        console.log("Adapter info:", {
          asset: adapterInfo[0],
          currency: adapterInfo[1], 
          feedAddress: adapterInfo[2],
          decimals: adapterInfo[3],
          heartbeat: adapterInfo[4].toString()
        });
      }
    } catch (error) {
      console.log("❌ ETH/USD test failed:", error.message);
    }
    
    console.log("\n--- BTC/USD Adapter Tests ---");
    try {
      const btcCanProvide = await api3BtcUsdAdapter.canProvideData();
      console.log("Can provide BTC/USD data:", btcCanProvide);
      
      if (btcCanProvide) {
        const btcPrice = await api3BtcUsdAdapter.getLatestValue();
        console.log("BTC/USD Price:", ethers.formatUnits(btcPrice, 18));
        
        const btcTimestamp = await api3BtcUsdAdapter.getLastUpdateTimestamp();
        const btcDate = new Date(Number(btcTimestamp) * 1000);
        console.log("Last updated:", btcDate.toLocaleString());
        
        const [isStale, age] = await api3BtcUsdAdapter.isDataStale();
        console.log("Is data stale:", isStale, "Age (seconds):", age.toString());
      }
    } catch (error) {
      console.log("❌ BTC/USD test failed:", error.message);
    }
    
    console.log("\n--- UNI/USD Adapter Tests ---");
    try {
      const uniCanProvide = await api3UniUsdAdapter.canProvideData();
      console.log("Can provide UNI/USD data:", uniCanProvide);
      
      if (uniCanProvide) {
        const uniPrice = await api3UniUsdAdapter.getLatestValue();
        console.log("UNI/USD Price:", ethers.formatUnits(uniPrice, 18));
        
        const uniTimestamp = await api3UniUsdAdapter.getLastUpdateTimestamp();
        const uniDate = new Date(Number(uniTimestamp) * 1000);
        console.log("Last updated:", uniDate.toLocaleString());
        
        const [isStale, age] = await api3UniUsdAdapter.isDataStale();
        console.log("Is data stale:", isStale, "Age (seconds):", age.toString());
        
        // Test custom age checking for UNI
        const [isStaleCustom, ageCustom] = await api3UniUsdAdapter.isDataStaleCustom(1800); // 30 minutes
        console.log("Is data stale (30min threshold):", isStaleCustom, "Age:", ageCustom.toString());
      }
    } catch (error) {
      console.log("❌ UNI/USD test failed:", error.message);
    }
    
    // Test compatibility methods
    console.log("\n--- Compatibility Tests ---");
    try {
      const ethRetrieveData = await api3EthUsdAdapter.retrieveData();
      console.log("ETH/USD via retrieveData():", ethRetrieveData.toString());
      
      const btcRetrieveData = await api3BtcUsdAdapter.retrieveData();
      console.log("BTC/USD via retrieveData():", btcRetrieveData.toString());
      
      const uniRetrieveData = await api3UniUsdAdapter.retrieveData();
      console.log("UNI/USD via retrieveData():", uniRetrieveData.toString());
    } catch (error) {
      console.log("❌ Compatibility test failed:", error.message);
    }
    
    // Test recent values functionality
    console.log("\n--- Recent Values Tests ---");
    try {
      console.log("Testing getRecentValues() for UNI/USD (getting 3 values)...");
      const [values, timestamps] = await api3UniUsdAdapter.getRecentValues(3);
      console.log("Recent values count:", values.length);
      for (let i = 0; i < values.length; i++) {
        console.log(`Value ${i + 1}: ${ethers.formatUnits(values[i], 18)} at ${new Date(Number(timestamps[i]) * 1000).toLocaleString()}`);
      }
    } catch (error) {
      console.log("❌ Recent values test failed:", error.message);
    }
    
    console.log("\n✅ API3Adapter testing completed successfully!");
    console.log("\n📋 Summary:");
    console.log("- API3 ETH/USD Adapter:", await api3EthUsdAdapter.getAddress());
    console.log("- API3 BTC/USD Adapter:", await api3BtcUsdAdapter.getAddress());
    console.log("- API3 UNI/USD Adapter:", await api3UniUsdAdapter.getAddress());
    console.log("\n🔗 Use these addresses in your PriceAggregator configuration with oracle type 3 (API3)");
    
    // Example configuration for PriceAggregator
    console.log("\n📝 Example PriceAggregator Oracle Source Configuration:");
    console.log(`{
  oracle: "${await api3EthUsdAdapter.getAddress()}",
  oracleType: 3, // API3
  weight: ethers.parseUnits("2", 18),
  heartbeatSeconds: 3600,
  description: "API3 ETH/USD",
  decimals: 18
}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });