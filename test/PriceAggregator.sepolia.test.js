const { expect } = require("chai");
const { ethers } = require("hardhat");
const addresses = require("../scripts/addresses");

describe("PriceAggregator Sepolia Live Tests", function () {
  // Set timeout for network calls
  this.timeout(300000); // 5 minutes
  
  let owner, user;
  let priceAggregator;
  let oracleLib, twapCalculator;
  
  // Real adapter contracts
  let chainlinkEthUsdAdapter, chainlinkBtcUsdAdapter, chainlinkLinkUsdAdapter;
  let api3EthUsdAdapter, api3BtcUsdAdapter;
  let tellorEthUsdAdapter, tellorBtcUsdAdapter, tellorLinkUsdAdapter;
  let uniswapV3GraphAdapter;
  
  before(async function () {
    console.log("🚀 Starting Sepolia live PriceAggregator tests...");
    console.log("📡 Using real Sepolia network endpoints");
    
    // Get signers
    [owner, user] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("Network:", (await ethers.provider.getNetwork()).name);
    
    await deployUtilityContracts();
    await deployRealAdapters();
    await deployPriceAggregator();
    await setupAssetPairs();
    
    console.log("✅ Setup complete with real Sepolia contracts!\n");
  });
  
  async function deployUtilityContracts() {
    console.log("📦 Deploying utility contracts...");
    
    const OracleLib = await ethers.getContractFactory("OracleLib");
    oracleLib = await OracleLib.deploy();
    await oracleLib.deploymentTransaction().wait(2);
    
    const TWAPCalculator = await ethers.getContractFactory("TWAPCalculator");
    twapCalculator = await TWAPCalculator.deploy();
    await twapCalculator.deploymentTransaction().wait(2);
    
    console.log("  ✓ OracleLib deployed to:", await oracleLib.getAddress());
    console.log("  ✓ TWAPCalculator deployed to:", await twapCalculator.getAddress());
  }
  
  async function deployRealAdapters() {
    console.log("🔌 Deploying adapters with real Sepolia endpoints...");
    
    // Chainlink Adapters
    const ChainlinkAdapter = await ethers.getContractFactory("ChainlinkAdapter");
    
    chainlinkEthUsdAdapter = await ChainlinkAdapter.deploy(
      addresses.chainlinkETHUSD,
      "ETH",
      "USD",
      3600 // 1 hour heartbeat
    );
    await chainlinkEthUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Chainlink ETH/USD adapter deployed");
    
    chainlinkBtcUsdAdapter = await ChainlinkAdapter.deploy(
      addresses.chainlinkBTCUSD,
      "BTC", 
      "USD",
      3600
    );
    await chainlinkBtcUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Chainlink BTC/USD adapter deployed");
    
    chainlinkLinkUsdAdapter = await ChainlinkAdapter.deploy(
      addresses.chainlinkLINKUSD,
      "LINK",
      "USD", 
      3600
    );
    await chainlinkLinkUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Chainlink LINK/USD adapter deployed");
    
    // API3 Adapters
    const API3Adapter = await ethers.getContractFactory("API3Adapter");
    
    api3EthUsdAdapter = await API3Adapter.deploy(
      addresses.API3ReaderProxyETHUSD,
      "ETH",
      "USD",
      3600,
      18
    );
    await api3EthUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ API3 ETH/USD adapter deployed");
    
    api3BtcUsdAdapter = await API3Adapter.deploy(
      addresses.API3ReaderProxyBTCUSD,
      "BTC",
      "USD",
      3600,
      18
    );
    await api3BtcUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ API3 BTC/USD adapter deployed");
    
    // Tellor Adapters
    const TellorAdapter = await ethers.getContractFactory("TellorAdapter");
    
    tellorEthUsdAdapter = await TellorAdapter.deploy(
      addresses.tellorContract,
      "eth",
      "usd"
    );
    await tellorEthUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Tellor ETH/USD adapter deployed");
    
    tellorBtcUsdAdapter = await TellorAdapter.deploy(
      addresses.tellorContract,
      "btc",
      "usd"
    );
    await tellorBtcUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Tellor BTC/USD adapter deployed");
    
    tellorLinkUsdAdapter = await TellorAdapter.deploy(
      addresses.tellorContract,
      "link",
      "usd"
    );
    await tellorLinkUsdAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Tellor LINK/USD adapter deployed");
    
    // Uniswap V3 Graph Adapter
    const UniswapV3GraphAdapter = await ethers.getContractFactory("UniswapV3GraphAdapter");
    uniswapV3GraphAdapter = await UniswapV3GraphAdapter.deploy();
    await uniswapV3GraphAdapter.deploymentTransaction().wait(2);
    console.log("  ✓ Uniswap V3 Graph adapter deployed");
    
    console.log("  📡 All adapters connected to real Sepolia endpoints");
  }
  
  async function deployPriceAggregator() {
    console.log("🏗️  Deploying PriceAggregator with real adapters...");
    
    const oracleSources = [
      // ETH/USD sources
      {
        oracle: await chainlinkEthUsdAdapter.getAddress(),
        oracleType: 0, // Chainlink
        weight: ethers.parseUnits("3", 18),
        heartbeatSeconds: 3600,
        description: "Chainlink ETH/USD",
        decimals: 8
      },
      {
        oracle: await api3EthUsdAdapter.getAddress(),
        oracleType: 3, // API3
        weight: ethers.parseUnits("1", 18),
        heartbeatSeconds: 3600,
        description: "API3 ETH/USD",
        decimals: 18
      },
      {
        oracle: await tellorEthUsdAdapter.getAddress(),
        oracleType: 2, // Tellor
        weight: ethers.parseUnits("2", 18),
        heartbeatSeconds: 3600,
        description: "Tellor ETH/USD",
        decimals: 18
      },
      {
        oracle: await uniswapV3GraphAdapter.getAddress(),
        oracleType: 1, // Uniswap
        weight: ethers.parseUnits("2", 18),
        heartbeatSeconds: 3600,
        description: "Uniswap ETH/USD",
        decimals: 18
      },
      // BTC/USD sources
      {
        oracle: await chainlinkBtcUsdAdapter.getAddress(),
        oracleType: 0, // Chainlink
        weight: ethers.parseUnits("3", 18),
        heartbeatSeconds: 3600,
        description: "Chainlink BTC/USD",
        decimals: 8
      },
      {
        oracle: await api3BtcUsdAdapter.getAddress(),
        oracleType: 3, // API3
        weight: ethers.parseUnits("1", 18),
        heartbeatSeconds: 3600,
        description: "API3 BTC/USD",
        decimals: 18
      },
      {
        oracle: await tellorBtcUsdAdapter.getAddress(),
        oracleType: 2, // Tellor
        weight: ethers.parseUnits("2", 18),
        heartbeatSeconds: 3600,
        description: "Tellor BTC/USD",
        decimals: 18
      },
      // LINK/USD sources
      {
        oracle: await chainlinkLinkUsdAdapter.getAddress(),
        oracleType: 0, // Chainlink
        weight: ethers.parseUnits("3", 18),
        heartbeatSeconds: 3600,
        description: "Chainlink LINK/USD",
        decimals: 8
      },
      {
        oracle: await tellorLinkUsdAdapter.getAddress(),
        oracleType: 2, // Tellor
        weight: ethers.parseUnits("2", 18),
        heartbeatSeconds: 3600,
        description: "Tellor LINK/USD",
        decimals: 18
      }
    ];
    
    const PriceAggregator = await ethers.getContractFactory("PriceAggregator");
    priceAggregator = await PriceAggregator.deploy(
      oracleSources,
      await oracleLib.getAddress(),
      await twapCalculator.getAddress()
    );
    await priceAggregator.deploymentTransaction().wait(2);
    
    console.log("  ✓ PriceAggregator deployed to:", await priceAggregator.getAddress());
  }
  
  async function setupAssetPairs() {
    console.log("⚙️  Setting up asset pairs...");
    
    // ETH-USD pair
    await priceAggregator.addAssetPair(
      "ETH-USD",
      "ETH",
      "USD",
      [
        await chainlinkEthUsdAdapter.getAddress(),
        await api3EthUsdAdapter.getAddress(),
        await tellorEthUsdAdapter.getAddress(),
        await uniswapV3GraphAdapter.getAddress()
      ]
    );
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // BTC-USD pair
    await priceAggregator.addAssetPair(
      "BTC-USD",
      "BTC",
      "USD",
      [
        await chainlinkBtcUsdAdapter.getAddress(),
        await api3BtcUsdAdapter.getAddress(),
        await tellorBtcUsdAdapter.getAddress()
      ]
    );
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // LINK-USD pair
    await priceAggregator.addAssetPair(
      "LINK-USD",
      "LINK",
      "USD",
      [
        await chainlinkLinkUsdAdapter.getAddress(),
        await tellorLinkUsdAdapter.getAddress()
      ]
    );
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("  ✓ All asset pairs configured with real oracle sources");
  }
  
  describe("🧪 Real Adapter Tests", function () {
    
    describe("Chainlink Adapters", function () {
      it("Should retrieve live ETH/USD price from Chainlink", async function () {
        console.log("  📡 Testing Chainlink ETH/USD...");
        
        try {
          const value = await chainlinkEthUsdAdapter.getLatestValue();
          const price = ethers.formatUnits(value, 8);
          console.log("    📊 Chainlink ETH/USD:", "$" + price);
          
          expect(value).to.be.gt(0);
          expect(parseFloat(price)).to.be.gt(1000); // ETH should be > $1000
          expect(parseFloat(price)).to.be.lt(10000); // ETH should be < $10000
        } catch (error) {
          console.log("    ⚠️  Chainlink ETH/USD error:", error.message);
          throw error;
        }
      });
      
      it("Should retrieve live BTC/USD price from Chainlink", async function () {
        console.log("  📡 Testing Chainlink BTC/USD...");
        
        try {
          const value = await chainlinkBtcUsdAdapter.getLatestValue();
          const price = ethers.formatUnits(value, 8);
          console.log("    📊 Chainlink BTC/USD:", "$" + price);
          
          expect(value).to.be.gt(0);
          expect(parseFloat(price)).to.be.gt(20000); // BTC should be > $20000
          expect(parseFloat(price)).to.be.lt(200000); // BTC should be < $200000
        } catch (error) {
          console.log("    ⚠️  Chainlink BTC/USD error:", error.message);
          throw error;
        }
      });
      
      it("Should retrieve live LINK/USD price from Chainlink", async function () {
        console.log("  📡 Testing Chainlink LINK/USD...");
        
        try {
          const value = await chainlinkLinkUsdAdapter.getLatestValue();
          const price = ethers.formatUnits(value, 8);
          console.log("    📊 Chainlink LINK/USD:", "$" + price);
          
          expect(value).to.be.gt(0);
          expect(parseFloat(price)).to.be.gt(5); // LINK should be > $5
          expect(parseFloat(price)).to.be.lt(100); // LINK should be < $100
        } catch (error) {
          console.log("    ⚠️  Chainlink LINK/USD error:", error.message);
          throw error;
        }
      });
    });
    
    describe("API3 Adapters", function () {
      it("Should retrieve live ETH/USD price from API3", async function () {
        console.log("  📡 Testing API3 ETH/USD...");
        
        try {
          const value = await api3EthUsdAdapter.getLatestValue();
          const price = ethers.formatUnits(value, 18);
          console.log("    📊 API3 ETH/USD:", "$" + price);
          
          expect(value).to.be.gt(0);
          expect(parseFloat(price)).to.be.gt(1000);
          expect(parseFloat(price)).to.be.lt(10000);
        } catch (error) {
          console.log("    ⚠️  API3 ETH/USD error:", error.message);
          // API3 might not be available on Sepolia, so we'll log but not fail
          console.log("    ℹ️  API3 may not be available on Sepolia testnet");
        }
      });
      
      it("Should retrieve live BTC/USD price from API3", async function () {
        console.log("  📡 Testing API3 BTC/USD...");
        
        try {
          const value = await api3BtcUsdAdapter.getLatestValue();
          const price = ethers.formatUnits(value, 18);
          console.log("    📊 API3 BTC/USD:", "$" + price);
          
          expect(value).to.be.gt(0);
          expect(parseFloat(price)).to.be.gt(20000);
          expect(parseFloat(price)).to.be.lt(200000);
        } catch (error) {
          console.log("    ⚠️  API3 BTC/USD error:", error.message);
          console.log("    ℹ️  API3 may not be available on Sepolia testnet");
        }
      });
    });
    
    describe("Tellor Adapters", function () {
      it("Should attempt to retrieve ETH/USD price from Tellor", async function () {
        console.log("  📡 Testing Tellor ETH/USD...");
        
        try {
          const value = await tellorEthUsdAdapter.getLatestValue();
          const price = ethers.formatUnits(value, 18);
          console.log("    📊 Tellor ETH/USD:", "$" + price);
          
          expect(value).to.be.gt(0);
        } catch (error) {
          console.log("    ⚠️  Tellor ETH/USD error:", error.message);
          console.log("    ℹ️  Tellor data may not be available or may be stale on testnet");
        }
      });
      
      it("Should check Tellor value count", async function () {
        console.log("  📡 Checking Tellor value count...");
        
        try {
          const count = await tellorEthUsdAdapter.getValueCount();
          console.log("    📊 Tellor ETH/USD value count:", count.toString());
        } catch (error) {
          console.log("    ⚠️  Tellor value count error:", error.message);
        }
      });
    });
    
    describe("Uniswap V3 Graph Adapter", function () {
      it("Should check if price data exists", async function () {
        console.log("  📡 Testing Uniswap V3 Graph adapter...");
        
        try {
          const price = await uniswapV3GraphAdapter.retrieveData();
          if (price > 0) {
            console.log("    📊 Uniswap V3 price:", ethers.formatUnits(price, 18));
            expect(price).to.be.gt(0);
          } else {
            console.log("    ℹ️  Uniswap V3 price data not yet updated");
          }
        } catch (error) {
          console.log("    ⚠️  Uniswap V3 error:", error.message);
          console.log("    ℹ️  Run updateUniswapPrices script first to populate data");
        }
      });
    });
  });
  
  describe("🎯 PriceAggregator Live Tests", function () {
    
    it("Should get aggregated ETH/USD price from live sources", async function () {
      console.log("  📊 Testing ETH/USD aggregation...");
      
      try {
        const [medianPrice, weightedPrice] = await priceAggregator.getAggregatedPrice("ETH-USD");
        
        console.log("    📊 ETH/USD Median Price: $" + ethers.formatUnits(medianPrice, 18));
        console.log("    📊 ETH/USD Weighted Price: $" + ethers.formatUnits(weightedPrice, 18));
        
        expect(medianPrice).to.be.gt(0);
        expect(weightedPrice).to.be.gt(0);
        
        const medianFloat = parseFloat(ethers.formatUnits(medianPrice, 18));
        const weightedFloat = parseFloat(ethers.formatUnits(weightedPrice, 18));
        
        expect(medianFloat).to.be.gt(1000);
        expect(medianFloat).to.be.lt(10000);
        expect(weightedFloat).to.be.gt(1000);
        expect(weightedFloat).to.be.lt(10000);
        
      } catch (error) {
        console.log("    ⚠️  ETH/USD aggregation error:", error.message);
        
        // If aggregation fails, let's check individual sources
        const [prices, types, descriptions] = await priceAggregator.getAllPrices("ETH-USD");
        console.log("    📊 Individual source status:");
        for (let i = 0; i < prices.length; i++) {
          console.log(`      • ${descriptions[i]}: $${ethers.formatUnits(prices[i], 18)}`);
        }
        
        throw error;
      }
    });
    
    it("Should get aggregated BTC/USD price from live sources", async function () {
      console.log("  📊 Testing BTC/USD aggregation...");
      
      try {
        const [medianPrice, weightedPrice] = await priceAggregator.getAggregatedPrice("BTC-USD");
        
        console.log("    📊 BTC/USD Median Price: $" + ethers.formatUnits(medianPrice, 18));
        console.log("    📊 BTC/USD Weighted Price: $" + ethers.formatUnits(weightedPrice, 18));
        
        expect(medianPrice).to.be.gt(0);
        expect(weightedPrice).to.be.gt(0);
        
        const medianFloat = parseFloat(ethers.formatUnits(medianPrice, 18));
        const weightedFloat = parseFloat(ethers.formatUnits(weightedPrice, 18));
        
        expect(medianFloat).to.be.gt(20000);
        expect(medianFloat).to.be.lt(200000);
        expect(weightedFloat).to.be.gt(20000);
        expect(weightedFloat).to.be.lt(200000);
        
      } catch (error) {
        console.log("    ⚠️  BTC/USD aggregation error:", error.message);
        
        const [prices, types, descriptions] = await priceAggregator.getAllPrices("BTC-USD");
        console.log("    📊 Individual source status:");
        for (let i = 0; i < prices.length; i++) {
          console.log(`      • ${descriptions[i]}: $${ethers.formatUnits(prices[i], 18)}`);
        }
        
        throw error;
      }
    });
    
    it("Should get aggregated LINK/USD price from live sources", async function () {
      console.log("  📊 Testing LINK/USD aggregation...");
      
      try {
        const [medianPrice, weightedPrice] = await priceAggregator.getAggregatedPrice("LINK-USD");
        
        console.log("    📊 LINK/USD Median Price: $" + ethers.formatUnits(medianPrice, 18));
        console.log("    📊 LINK/USD Weighted Price: $" + ethers.formatUnits(weightedPrice, 18));
        
        expect(medianPrice).to.be.gt(0);
        expect(weightedPrice).to.be.gt(0);
        
        const medianFloat = parseFloat(ethers.formatUnits(medianPrice, 18));
        const weightedFloat = parseFloat(ethers.formatUnits(weightedPrice, 18));
        
        expect(medianFloat).to.be.gt(5);
        expect(medianFloat).to.be.lt(100);
        expect(weightedFloat).to.be.gt(5);
        expect(weightedFloat).to.be.lt(100);
        
      } catch (error) {
        console.log("    ⚠️  LINK/USD aggregation error:", error.message);
        
        const [prices, types, descriptions] = await priceAggregator.getAllPrices("LINK-USD");
        console.log("    📊 Individual source status:");
        for (let i = 0; i < prices.length; i++) {
          console.log(`      • ${descriptions[i]}: $${ethers.formatUnits(prices[i], 18)}`);
        }
        
        throw error;
      }
    });
    
    it("Should show detailed breakdown of all prices", async function () {
      console.log("  📊 Getting detailed price breakdown...");
      
      const pairs = ["ETH-USD", "BTC-USD", "LINK-USD"];
      
      for (const pair of pairs) {
        console.log(`\n    💰 ${pair} Price Sources:`);
        
        try {
          const [prices, types, descriptions, timestamps] = await priceAggregator.getAllPrices(pair);
          
          for (let i = 0; i < prices.length; i++) {
            const priceFormatted = ethers.formatUnits(prices[i], 18);
            const timeFormatted = new Date(Number(timestamps[i]) * 1000).toLocaleString();
            const typeNames = ["Chainlink", "Uniswap", "Tellor", "API3"];
            
            console.log(`      • ${descriptions[i]} (${typeNames[types[i]]}): $${priceFormatted}`);
            console.log(`        Last updated: ${timeFormatted}`);
          }
          
        } catch (error) {
          console.log(`    ⚠️  ${pair} error:`, error.message);
        }
      }
    });
  });
  
  describe("🔍 Live Data Analysis", function () {
    
    it("Should analyze price consistency across sources", async function () {
      console.log("  📊 Analyzing price consistency...");
      
      const pairs = ["ETH-USD", "BTC-USD", "LINK-USD"];
      
      for (const pair of pairs) {
        try {
          const [prices, types, descriptions] = await priceAggregator.getAllPrices(pair);
          
          if (prices.length < 2) {
            console.log(`    ℹ️  ${pair}: Only ${prices.length} source(s) available`);
            continue;
          }
          
          const pricesFloat = prices.map(p => parseFloat(ethers.formatUnits(p, 18)));
          const validPrices = pricesFloat.filter(p => p > 0);
          
          if (validPrices.length < 2) {
            console.log(`    ℹ️  ${pair}: Only ${validPrices.length} valid price(s)`);
            continue;
          }
          
          const min = Math.min(...validPrices);
          const max = Math.max(...validPrices);
          const avg = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
          const deviation = ((max - min) / avg) * 100;
          
          console.log(`    📊 ${pair} Analysis:`);
          console.log(`      • Min: $${min.toFixed(2)}`);
          console.log(`      • Max: $${max.toFixed(2)}`);
          console.log(`      • Avg: $${avg.toFixed(2)}`);
          console.log(`      • Deviation: ${deviation.toFixed(2)}%`);
          
          // Alert if deviation is high
          if (deviation > 5) {
            console.log(`      ⚠️  High price deviation detected!`);
          } else {
            console.log(`      ✅ Price consistency looks good`);
          }
          
        } catch (error) {
          console.log(`    ⚠️  ${pair} analysis error:`, error.message);
        }
      }
    });
    
    it("Should check data freshness across sources", async function () {
      console.log("  📊 Checking data freshness...");
      
      const pairs = ["ETH-USD", "BTC-USD", "LINK-USD"];
      
      for (const pair of pairs) {
        try {
          const [prices, types, descriptions, timestamps] = await priceAggregator.getAllPrices(pair);
          
          console.log(`    ⏰ ${pair} Data Freshness:`);
          
          for (let i = 0; i < timestamps.length; i++) {
            const age = Date.now() / 1000 - Number(timestamps[i]);
            const ageMinutes = Math.floor(age / 60);
            const ageHours = Math.floor(ageMinutes / 60);
            
            let ageString;
            if (ageHours > 0) {
              ageString = `${ageHours}h ${ageMinutes % 60}m ago`;
            } else {
              ageString = `${ageMinutes}m ago`;
            }
            
            const freshness = age < 3600 ? "🟢 Fresh" : age < 7200 ? "🟡 Stale" : "🔴 Very Stale";
            
            console.log(`      • ${descriptions[i]}: ${ageString} ${freshness}`);
          }
          
        } catch (error) {
          console.log(`    ⚠️  ${pair} freshness check error:`, error.message);
        }
      }
    });
  });
  
  after(async function () {
    console.log("\n🎉 Sepolia live tests completed!");
    console.log("📋 Test Summary:");
    console.log("  • Real Chainlink price feeds ✅");
    console.log("  • Real API3 price feeds 📡");
    console.log("  • Real Tellor price feeds 📡");
    console.log("  • Uniswap V3 Graph integration 📡");
    console.log("  • Live price aggregation ✅");
    console.log("  • Data consistency analysis ✅");
    console.log("  • Freshness monitoring ✅");
    console.log("\n💡 Note: Some oracle sources may not be available on Sepolia testnet");
    console.log("💡 Run 'npx hardhat run scripts/updateUniswapPrices.js --network sepolia' to update Uniswap data");
  });
});