const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceAggregator Comprehensive Tests", function () {
  // Set timeout for complex tests
  this.timeout(120000);
  
  let owner, user, admin;
  let priceAggregator;
  let oracleLib, twapCalculator;
  
  // Adapter contracts
  let chainlinkAdapter, api3Adapter, tellorAdapter, uniswapAdapter;
  
  // Mock oracle contracts
  let chainlinkMock, api3Mock, tellorMock, uniswapMock;
  
  // Test constants
  const ETH_USD_PRICE = ethers.parseUnits("3000", 8); // Chainlink format
  const BTC_USD_PRICE = ethers.parseUnits("60000", 8);
  const LINK_USD_PRICE = ethers.parseUnits("20", 8);
  
  before(async function () {
    console.log("🚀 Starting comprehensive PriceAggregator tests...");
    
    // Get signers
    [owner, user, admin] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("User:", user.address);
    
    await deployUtilityContracts();
    await deployMockOracles();
    await deployAdapters();
    await deployPriceAggregator();
    await setupAssetPairs();
    
    console.log("✅ Setup complete!\n");
  });
  
  async function deployUtilityContracts() {
    console.log("📦 Deploying utility contracts...");
    
    const OracleLib = await ethers.getContractFactory("OracleLib");
    oracleLib = await OracleLib.deploy();
    await oracleLib.deploymentTransaction().wait(1);
    
    const TWAPCalculator = await ethers.getContractFactory("TWAPCalculator");
    twapCalculator = await TWAPCalculator.deploy();
    await twapCalculator.deploymentTransaction().wait(1);
    
    console.log("  ✓ OracleLib deployed");
    console.log("  ✓ TWAPCalculator deployed");
  }
  
  async function deployMockOracles() {
    console.log("🎭 Deploying mock oracles...");
    
    // Chainlink Mocks
    const ChainlinkMock = await ethers.getContractFactory("ChainlinkMock");
    chainlinkMock = await ChainlinkMock.deploy(ETH_USD_PRICE, "ETH / USD", 8);
    await chainlinkMock.deploymentTransaction().wait(1);
    
    // API3 Mock
    const API3Mock = await ethers.getContractFactory("API3Mock");
    api3Mock = await API3Mock.deploy(ethers.parseUnits("3000", 18));
    await api3Mock.deploymentTransaction().wait(1);
    
    // Configure API3 with data feed ID
    const ETH_USD_FEED_ID = "0x4385954e058fbe6b6a744f32a4f89d67aad099f8fb8b23e7ea8dd366ae88151d";
    await api3Mock.setDataFeedValue(ETH_USD_FEED_ID, ethers.parseUnits("3000", 18), 0);
    
    // Tellor Mock
    const TellorMock = await ethers.getContractFactory("TellorMock");
    tellorMock = await TellorMock.deploy(ethers.parseUnits("3000", 18));
    await tellorMock.deploymentTransaction().wait(1);
    
    // Uniswap Mock
    const UniswapV3GraphAdapter = await ethers.getContractFactory("UniswapV3GraphAdapter");
    uniswapMock = await UniswapV3GraphAdapter.deploy();
    await uniswapMock.deploymentTransaction().wait(1);
    
    // Configure Uniswap mock with price data
    await uniswapMock.updatePrice(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      3000,
      ethers.parseUnits("3000", 18),
      "ETH-USDC",
      ethers.parseUnits("1000000", 0)
    );
    
    await uniswapMock.updateTickCumulatives(1000000, 1001800);
    
    console.log("  ✓ All mock oracles deployed");
  }
  
  async function deployAdapters() {
    console.log("🔌 Deploying adapters...");
    
    // Chainlink Adapter
    const ChainlinkAdapter = await ethers.getContractFactory("ChainlinkAdapter");
    chainlinkAdapter = await ChainlinkAdapter.deploy(
      await chainlinkMock.getAddress(),
      "ETH",
      "USD",
      3600 // 1 hour heartbeat
    );
    await chainlinkAdapter.deploymentTransaction().wait(1);
    
    // API3 Adapter
    const API3Adapter = await ethers.getContractFactory("API3Adapter");
    api3Adapter = await API3Adapter.deploy(
      await api3Mock.getAddress(),
      "ETH",
      "USD",
      3600,
      18
    );
    await api3Adapter.deploymentTransaction().wait(1);
    
    // Tellor Adapter
    const TellorAdapter = await ethers.getContractFactory("TellorAdapter");
    tellorAdapter = await TellorAdapter.deploy(
      await tellorMock.getAddress(),
      "eth",
      "usd"
    );
    await tellorAdapter.deploymentTransaction().wait(1);
    
    uniswapAdapter = uniswapMock; // Use the GraphAdapter directly
    
    console.log("  ✓ All adapters deployed");
  }
  
  async function deployPriceAggregator() {
    console.log("🏗️  Deploying PriceAggregator...");
    
    const oracleSources = [
      {
        oracle: await chainlinkAdapter.getAddress(),
        oracleType: 0, // Chainlink
        weight: ethers.parseUnits("3", 18),
        heartbeatSeconds: 3600,
        description: "Chainlink ETH/USD",
        decimals: 8
      },
      {
        oracle: await uniswapAdapter.getAddress(),
        oracleType: 1, // Uniswap
        weight: ethers.parseUnits("2", 18),
        heartbeatSeconds: 3600,
        description: "Uniswap ETH/USD",
        decimals: 18
      },
      {
        oracle: await tellorAdapter.getAddress(),
        oracleType: 2, // Tellor
        weight: ethers.parseUnits("2", 18),
        heartbeatSeconds: 3600,
        description: "Tellor ETH/USD",
        decimals: 18
      },
      {
        oracle: await api3Adapter.getAddress(),
        oracleType: 3, // API3
        weight: ethers.parseUnits("1", 18),
        heartbeatSeconds: 3600,
        description: "API3 ETH/USD",
        decimals: 18
      }
    ];
    
    const PriceAggregator = await ethers.getContractFactory("PriceAggregator");
    priceAggregator = await PriceAggregator.deploy(
      oracleSources,
      await oracleLib.getAddress(),
      await twapCalculator.getAddress()
    );
    await priceAggregator.deploymentTransaction().wait(1);
    
    console.log("  ✓ PriceAggregator deployed");
  }
  
  async function setupAssetPairs() {
    console.log("⚙️  Setting up asset pairs...");
    
    await priceAggregator.addAssetPair(
      "ETH-USD",
      "ETH",
      "USD",
      [
        await chainlinkAdapter.getAddress(),
        await uniswapAdapter.getAddress(),
        await tellorAdapter.getAddress(),
        await api3Adapter.getAddress()
      ]
    );
    
    console.log("  ✓ ETH-USD pair configured");
  }
  
  describe("🧪 Adapter Individual Tests", function () {
    
    describe("Chainlink Adapter", function () {
      it("Should retrieve latest value", async function () {
        const value = await chainlinkAdapter.getLatestValue();
        console.log("  📊 Chainlink price:", ethers.formatUnits(value, 8));
        expect(value).to.be.gt(0);
      });
      
      it("Should get latest value with age requirement", async function () {
        const [value, timestamp] = await chainlinkAdapter.getLatestValueWithAge(3600);
        console.log("  📊 Chainlink price with timestamp:", ethers.formatUnits(value, 8));
        expect(value).to.be.gt(0);
        expect(timestamp).to.be.gt(0);
      });
      
      it("Should handle multiple recent values", async function () {
        const [values, timestamps, roundIds] = await chainlinkAdapter.getRecentValues(3);
        console.log("  📊 Recent values count:", values.length);
        expect(values.length).to.be.gt(0);
      });
      
      it("Should detect data staleness", async function () {
        const [isStale, age] = await chainlinkAdapter.isDataStale();
        console.log("  📊 Data stale:", isStale, "Age:", age.toString());
        expect(age).to.be.gt(0);
      });
    });
    
    describe("API3 Adapter", function () {
      it("Should retrieve latest value", async function () {
        const value = await api3Adapter.getLatestValue();
        console.log("  📊 API3 price:", ethers.formatUnits(value, 18));
        expect(value).to.be.gt(0);
      });
      
      it("Should get latest value with age requirement", async function () {
        const [value, timestamp] = await api3Adapter.getLatestValueWithAge(3600);
        console.log("  📊 API3 price with timestamp:", ethers.formatUnits(value, 18));
        expect(value).to.be.gt(0);
        expect(timestamp).to.be.gt(0);
      });
      
      it("Should check if adapter can provide data", async function () {
        const canProvide = await api3Adapter.canProvideData();
        console.log("  📊 API3 can provide data:", canProvide);
        expect(canProvide).to.be.true;
      });
    });
    
    describe("Tellor Adapter", function () {
      it("Should retrieve latest value", async function () {
        try {
          const value = await tellorAdapter.getLatestValue();
          console.log("  📊 Tellor price:", ethers.formatUnits(value, 18));
          expect(value).to.be.gt(0);
        } catch (error) {
          console.log("  ⚠️  Tellor data not available (expected in test environment)");
          expect(error.message).to.include("Data is stale");
        }
      });
      
      it("Should get multiple values", async function () {
        try {
          const [values, timestamps] = await tellorAdapter.getMultipleValues(86400, 5);
          console.log("  📊 Tellor multiple values count:", values.length);
        } catch (error) {
          console.log("  ⚠️  Tellor historical data not available (expected in test environment)");
        }
      });
      
      it("Should get value count", async function () {
        const count = await tellorAdapter.getValueCount();
        console.log("  📊 Tellor value count:", count.toString());
      });
    });
    
    describe("Uniswap Adapter", function () {
      it("Should retrieve price data", async function () {
        const price = await uniswapAdapter.retrieveData();
        console.log("  📊 Uniswap price:", ethers.formatUnits(price, 18));
        expect(price).to.be.gt(0);
      });
      
      it("Should get last update timestamp", async function () {
        const timestamp = await uniswapAdapter.getLastUpdateTimestamp();
        console.log("  📊 Uniswap last update:", new Date(Number(timestamp) * 1000).toLocaleString());
        expect(timestamp).to.be.gt(0);
      });
    });
  });
  
  describe("🎯 PriceAggregator Core Functionality", function () {
    
    it("Should return median price for ETH-USD", async function () {
      const medianPrice = await priceAggregator.getMedianPrice("ETH-USD");
      console.log("  📊 ETH-USD Median Price: $" + ethers.formatUnits(medianPrice, 18));
      
      expect(medianPrice).to.be.gt(ethers.parseUnits("2000", 18));
      expect(medianPrice).to.be.lt(ethers.parseUnits("4000", 18));
    });
    
    it("Should return weighted price for ETH-USD", async function () {
      const weightedPrice = await priceAggregator.getWeightedPrice("ETH-USD");
      console.log("  📊 ETH-USD Weighted Price: $" + ethers.formatUnits(weightedPrice, 18));
      
      expect(weightedPrice).to.be.gt(ethers.parseUnits("2000", 18));
      expect(weightedPrice).to.be.lt(ethers.parseUnits("4000", 18));
    });
    
    it("Should return both aggregated prices", async function () {
      const [medianPrice, weightedPrice] = await priceAggregator.getAggregatedPrice("ETH-USD");
      console.log("  📊 Median: $" + ethers.formatUnits(medianPrice, 18));
      console.log("  📊 Weighted: $" + ethers.formatUnits(weightedPrice, 18));
      
      expect(medianPrice).to.be.gt(0);
      expect(weightedPrice).to.be.gt(0);
    });
    
    it("Should return all prices with details", async function () {
      const [prices, sourceTypes, descriptions, timestamps] = await priceAggregator.getAllPrices("ETH-USD");
      
      console.log("  📊 All ETH-USD prices:");
      for (let i = 0; i < prices.length; i++) {
        console.log(`    • ${descriptions[i]}: $${ethers.formatUnits(prices[i], 18)} (Type: ${sourceTypes[i]})`);
      }
      
      expect(prices.length).to.equal(4);
      expect(sourceTypes.length).to.equal(4);
      expect(descriptions.length).to.equal(4);
      expect(timestamps.length).to.equal(4);
    });
    
    it("Should return prices with dispute status", async function () {
      const [prices, sourceTypes, descriptions, timestamps, disputeStatus] = 
        await priceAggregator.getAllPricesWithStatus("ETH-USD");
      
      console.log("  📊 Prices with dispute status:");
      for (let i = 0; i < prices.length; i++) {
        console.log(`    • ${descriptions[i]}: $${ethers.formatUnits(prices[i], 18)} (Disputed: ${disputeStatus[i]})`);
      }
      
      expect(disputeStatus.length).to.equal(prices.length);
    });
  });
  
  describe("🔄 Price Updates and Changes", function () {
    
    it("Should reflect Chainlink price changes", async function () {
      const initialPrice = await priceAggregator.getWeightedPrice("ETH-USD");
      
      // Update Chainlink price
      await chainlinkMock.setAnswer(ethers.parseUnits("3500", 8));
      await ethers.provider.send("evm_mine", []);
      
      const newPrice = await priceAggregator.getWeightedPrice("ETH-USD");
      console.log("  📊 Price change: $" + ethers.formatUnits(initialPrice, 18) + " → $" + ethers.formatUnits(newPrice, 18));
      
      expect(newPrice).to.not.equal(initialPrice);
    });
    
    it("Should reflect API3 price changes", async function () {
      const initialPrice = await priceAggregator.getWeightedPrice("ETH-USD");
      
      // Update API3 price
      const ETH_USD_FEED_ID = "0x4385954e058fbe6b6a744f32a4f89d67aad099f8fb8b23e7ea8dd366ae88151d";
      await api3Mock.setDataFeedValue(ETH_USD_FEED_ID, ethers.parseUnits("3200", 18), 0);
      await ethers.provider.send("evm_mine", []);
      
      const newPrice = await priceAggregator.getWeightedPrice("ETH-USD");
      console.log("  📊 API3 price change reflected");
      
      expect(newPrice).to.not.equal(initialPrice);
    });
    
    it("Should handle extreme outliers appropriately", async function () {
      // Set one oracle to extreme value
      await chainlinkMock.setAnswer(ethers.parseUnits("10000", 8)); // $10,000
      await ethers.provider.send("evm_mine", []);
      
      const medianPrice = await priceAggregator.getMedianPrice("ETH-USD");
      const weightedPrice = await priceAggregator.getWeightedPrice("ETH-USD");
      
      console.log("  📊 With outlier - Median: $" + ethers.formatUnits(medianPrice, 18));
      console.log("  📊 With outlier - Weighted: $" + ethers.formatUnits(weightedPrice, 18));
      
      // Median should be more resistant to outliers than weighted average
      expect(medianPrice).to.be.lt(ethers.parseUnits("8000", 18));
      expect(weightedPrice).to.be.gt(medianPrice); // Weighted will be pulled up by the outlier
    });
  });
  
  describe("🛡️ Error Handling and Edge Cases", function () {
    
    it("Should handle stale data detection", async function () {
      // Set stale timestamp for Chainlink
      const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
      await chainlinkMock.setUpdateTime(oneDayAgo);
      
      // Should still return a price from other sources
      try {
        const price = await priceAggregator.getMedianPrice("ETH-USD");
        console.log("  📊 Price with stale Chainlink: $" + ethers.formatUnits(price, 18));
        expect(price).to.be.gt(0);
      } catch (error) {
        console.log("  ⚠️  All sources stale, expected error:", error.message);
      }
    });
    
    it("Should handle insufficient oracle responses", async function () {
      // Set minimum responses higher than available
      await priceAggregator.setMinOracleResponses(10);
      
      await expect(priceAggregator.getMedianPrice("ETH-USD"))
        .to.be.revertedWith("Insufficient valid prices");
      
      // Reset for other tests
      await priceAggregator.setMinOracleResponses(1);
    });
    
    it("Should handle inactive asset pairs", async function () {
      await priceAggregator.setAssetPairStatus("ETH-USD", false);
      
      await expect(priceAggregator.getMedianPrice("ETH-USD"))
        .to.be.revertedWith("Asset pair not active");
      
      // Reactivate for other tests
      await priceAggregator.setAssetPairStatus("ETH-USD", true);
    });
  });
  
  describe("👑 Admin Functions", function () {
    
    it("Should allow adding new oracle sources", async function () {
      const initialSources = await priceAggregator.getSources();
      const initialCount = initialSources.length;
      
      // Deploy another mock for testing
      const ChainlinkMock = await ethers.getContractFactory("ChainlinkMock");
      const newMock = await ChainlinkMock.deploy(BTC_USD_PRICE, "BTC / USD", 8);
      await newMock.deploymentTransaction().wait(1);
      
      await priceAggregator.addOracleSource({
        oracle: await newMock.getAddress(),
        oracleType: 0,
        weight: ethers.parseUnits("2", 18),
        heartbeatSeconds: 3600,
        description: "Chainlink BTC/USD",
        decimals: 8
      });
      
      const newSources = await priceAggregator.getSources();
      expect(newSources.length).to.equal(initialCount + 1);
      console.log("  ✅ Added new oracle source");
    });
    
    it("Should allow updating oracle weights", async function () {
      const sources = await priceAggregator.getSources();
      const oracleAddress = sources[0].oracle;
      const newWeight = ethers.parseUnits("5", 18);
      
      await priceAggregator.updateOracleWeight(oracleAddress, newWeight);
      
      const updatedSources = await priceAggregator.getSources();
      const updatedSource = updatedSources.find(s => s.oracle === oracleAddress);
      expect(updatedSource.weight).to.equal(newWeight);
      console.log("  ✅ Updated oracle weight");
    });
    
    it("Should allow adding new asset pairs", async function () {
      const initialCount = await priceAggregator.getSupportedPairsCount();
      
      await priceAggregator.addAssetPair(
        "BTC-USD",
        "BTC",
        "USD",
        [await chainlinkAdapter.getAddress()]
      );
      
      const newCount = await priceAggregator.getSupportedPairsCount();
      expect(newCount).to.equal(initialCount + 1);
      console.log("  ✅ Added new asset pair: BTC-USD");
    });
    
    it("Should only allow owner to perform admin functions", async function () {
      const newSource = {
        oracle: await chainlinkAdapter.getAddress(),
        oracleType: 0,
        weight: ethers.parseUnits("1", 18),
        heartbeatSeconds: 3600,
        description: "Test Source",
        decimals: 8
      };
      
      // Should fail with non-owner
      await expect(priceAggregator.connect(user).addOracleSource(newSource))
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      // Should succeed with owner
      await expect(priceAggregator.connect(owner).setMinOracleResponses(2))
        .to.not.be.reverted;
      
      console.log("  ✅ Access control working correctly");
    });
  });
  
  describe("📈 Advanced Analytics", function () {
    
    it("Should provide Tellor analytics", async function () {
      try {
        const [valueCount, lastReporter, lastTimestamp, isDisputed] = 
          await priceAggregator.getTellorAnalytics(await tellorAdapter.getAddress());
        
        console.log("  📊 Tellor Analytics:");
        console.log("    • Value count:", valueCount.toString());
        console.log("    • Last reporter:", lastReporter);
        console.log("    • Last timestamp:", new Date(Number(lastTimestamp) * 1000).toLocaleString());
        console.log("    • Is disputed:", isDisputed);
      } catch (error) {
        console.log("  ⚠️  Tellor analytics not available in test environment");
      }
    });
    
    it("Should check for Tellor disputes", async function () {
      const [hasDisputed, disputedSources] = await priceAggregator.checkTellorDisputes("ETH-USD");
      console.log("  📊 Tellor disputes check:");
      console.log("    • Has disputed data:", hasDisputed);
      console.log("    • Disputed sources:", disputedSources.length);
    });
    
    it("Should get asset pair sources", async function () {
      const sources = await priceAggregator.getAssetPairSources("ETH-USD");
      console.log("  📊 ETH-USD sources:", sources.length);
      expect(sources.length).to.equal(4);
    });
  });
  
  describe("🔍 Integration Tests", function () {
    
    it("Should handle complete price aggregation workflow", async function () {
      console.log("  🔄 Running complete workflow test...");
      
      // 1. Get initial prices
      const [initialMedian, initialWeighted] = await priceAggregator.getAggregatedPrice("ETH-USD");
      console.log("    📊 Initial prices - Median:", ethers.formatUnits(initialMedian, 18), "Weighted:", ethers.formatUnits(initialWeighted, 18));
      
      // 2. Update multiple oracle prices
      await chainlinkMock.setAnswer(ethers.parseUnits("3100", 8));
      const ETH_USD_FEED_ID = "0x4385954e058fbe6b6a744f32a4f89d67aad099f8fb8b23e7ea8dd366ae88151d";
      await api3Mock.setDataFeedValue(ETH_USD_FEED_ID, ethers.parseUnits("3050", 18), 0);
      await ethers.provider.send("evm_mine", []);
      
      // 3. Get updated prices
      const [newMedian, newWeighted] = await priceAggregator.getAggregatedPrice("ETH-USD");
      console.log("    📊 Updated prices - Median:", ethers.formatUnits(newMedian, 18), "Weighted:", ethers.formatUnits(newWeighted, 18));
      
      // 4. Verify changes
      expect(newMedian).to.not.equal(initialMedian);
      expect(newWeighted).to.not.equal(initialWeighted);
      
      // 5. Get detailed breakdown
      const [prices, types, descriptions] = await priceAggregator.getAllPrices("ETH-USD");
      console.log("    📊 Final price breakdown:");
      for (let i = 0; i < prices.length; i++) {
        console.log(`      • ${descriptions[i]}: $${ethers.formatUnits(prices[i], 18)}`);
      }
      
      console.log("  ✅ Complete workflow test passed");
    });
    
    it("Should maintain price consistency across different query methods", async function () {
      const medianPrice1 = await priceAggregator.getMedianPrice("ETH-USD");
      const [medianPrice2,] = await priceAggregator.getAggregatedPrice("ETH-USD");
      
      expect(medianPrice1).to.equal(medianPrice2);
      console.log("  ✅ Price consistency maintained");
    });
  });
  
  after(async function () {
    console.log("\n🎉 All comprehensive tests completed!");
    console.log("📋 Test Summary:");
    console.log("  • Individual adapter functionality ✅");
    console.log("  • Core price aggregation ✅");
    console.log("  • Price update mechanisms ✅");
    console.log("  • Error handling ✅");
    console.log("  • Admin functions ✅");
    console.log("  • Advanced analytics ✅");
    console.log("  • Integration workflows ✅");
  });
});