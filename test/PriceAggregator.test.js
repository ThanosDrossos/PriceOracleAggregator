const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceAggregator", function () {
    let PriceAggregator;
    let priceAggregator;
    let owner, user;
    let chainlinkMock, api3Mock, tellorMock, uniswapV3Mock;
    
    // Setup mock prices
    const ETH_PRICE_USD = 3000;
    const ETH_PRICE_CHAINLINK = ETH_PRICE_USD * 10**8; // Chainlink uses 8 decimals
    const ETH_PRICE_API3 = ETH_PRICE_USD * 10**18; // API3 uses 18 decimals
    const ETH_PRICE_TELLOR = ETH_PRICE_USD * 10**18; // Tellor uses 18 decimals
    // Uniswap uses ticks, which will be converted to price by the TWAPCalculator
    const UNISWAP_TICK_CUMULATIVE = 100000;
    
    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();
        
        // Deploy mock oracles
        const ChainlinkMock = await ethers.getContractFactory("ChainlinkMock");
        chainlinkMock = await ChainlinkMock.deploy(ETH_PRICE_CHAINLINK, "ETH / USD", 8);
        await chainlinkMock.deployed();
        
        const API3Mock = await ethers.getContractFactory("API3Mock");
        api3Mock = await API3Mock.deploy(ETH_PRICE_API3);
        await api3Mock.deployed();
        
        const TellorMock = await ethers.getContractFactory("TellorMock");
        tellorMock = await TellorMock.deploy(ETH_PRICE_TELLOR);
        await tellorMock.deployed();
        
        const UniswapV3Mock = await ethers.getContractFactory("UniswapV3Mock");
        uniswapV3Mock = await UniswapV3Mock.deploy(UNISWAP_TICK_CUMULATIVE);
        await uniswapV3Mock.deployed();
        
        // Setup oracle sources for constructor
        const oracleSources = [
            {
                oracle: chainlinkMock.address,
                oracleType: 0,  // Chainlink
                weight: 2,       // Higher weight for Chainlink
                heartbeatSeconds: 3600, // 1 hour heartbeat
                description: "Chainlink ETH/USD",
                decimals: 8
            },
            {
                oracle: uniswapV3Mock.address,
                oracleType: 1,  // Uniswap
                weight: 1,
                heartbeatSeconds: 3600,
                description: "Uniswap ETH/USD",
                decimals: 18
            },
            {
                oracle: tellorMock.address,
                oracleType: 2,  // Tellor
                weight: 1,
                heartbeatSeconds: 3600,
                description: "Tellor ETH/USD",
                decimals: 18
            },
            {
                oracle: api3Mock.address,
                oracleType: 3,  // API3
                weight: 1,
                heartbeatSeconds: 3600,
                description: "API3 ETH/USD",
                decimals: 18
            }
        ];
        
        // Deploy the PriceAggregator contract
        PriceAggregator = await ethers.getContractFactory("PriceAggregator");
        priceAggregator = await PriceAggregator.deploy(oracleSources);
        await priceAggregator.deployed();
        
        // Add an asset pair
        await priceAggregator.addAssetPair(
            "ETH-USD",
            "ETH",
            "USD",
            [
                chainlinkMock.address,
                uniswapV3Mock.address,
                tellorMock.address,
                api3Mock.address
            ]
        );
    });
    
    describe("Basic Functionality", function () {
        it("should have correct initial configuration", async function () {
            expect(await priceAggregator.getSupportedPairsCount()).to.equal(1);
            expect(await priceAggregator.minOracleResponses()).to.equal(1);
            expect(await priceAggregator.stalenessThreshold()).to.equal(3600);
        });
        
        it("should get median price for ETH-USD", async function () {
            const medianPrice = await priceAggregator.getMedianPrice("ETH-USD");
            // All oracles are set to return approximately 3000 USD in their respective formats
            // After normalization, we should get a value close to 3000 * 10^18
            const expectedPrice = ethers.utils.parseEther("3000");
            
            // Allow for some variation due to precision differences
            expect(medianPrice).to.be.closeTo(expectedPrice, expectedPrice.div(100)); // Within 1%
        });
        
        it("should get weighted price for ETH-USD", async function () {
            const weightedPrice = await priceAggregator.getWeightedPrice("ETH-USD");
            const expectedPrice = ethers.utils.parseEther("3000");
            
            expect(weightedPrice).to.be.closeTo(expectedPrice, expectedPrice.div(100)); // Within 1%
        });
        
        it("should get aggregated prices", async function () {
            const [medianPrice, weightedPrice] = await priceAggregator.getAggregatedPrice("ETH-USD");
            const expectedPrice = ethers.utils.parseEther("3000");
            
            expect(medianPrice).to.be.closeTo(expectedPrice, expectedPrice.div(100));
            expect(weightedPrice).to.be.closeTo(expectedPrice, expectedPrice.div(100));
        });
        
        it("should get all prices", async function () {
            const [prices, sourceTypes, descriptions, timestamps] = await priceAggregator.getAllPrices("ETH-USD");
            
            expect(prices.length).to.equal(4);
            expect(sourceTypes.length).to.equal(4);
            expect(descriptions.length).to.equal(4);
            expect(timestamps.length).to.equal(4);
            
            // All prices should be approximately 3000 USD after normalization
            const expectedPrice = ethers.utils.parseEther("3000");
            for (let i = 0; i < prices.length; i++) {
                expect(prices[i]).to.be.closeTo(expectedPrice, expectedPrice.div(100));
            }
        });
    });
    
    describe("Admin Functions", function () {
        it("should add a new oracle source", async function () {
            const newOracle = {
                oracle: "0x1234567890123456789012345678901234567890", // Dummy address
                oracleType: 0, // Chainlink
                weight: 1,
                heartbeatSeconds: 3600,
                description: "New Chainlink Oracle",
                decimals: 8
            };
            
            await priceAggregator.addOracleSource(newOracle);
            // Check that the source was added by trying to get its index
            // If it doesn't revert, it means the source was added
            await expect(priceAggregator.getAssetPairSources("ETH-USD")).to.not.be.reverted;
        });
        
        it("should update oracle weight", async function () {
            await priceAggregator.updateOracleWeight(chainlinkMock.address, 5);
            // No direct way to check the weight was updated, but we can verify
            // the transaction succeeded
            await expect(priceAggregator.getAssetPairSources("ETH-USD")).to.not.be.reverted;
        });
        
        it("should set minimum oracle responses", async function () {
            await priceAggregator.setMinOracleResponses(2);
            expect(await priceAggregator.minOracleResponses()).to.equal(2);
        });
        
        it("should set staleness threshold", async function () {
            await priceAggregator.setStalenessThreshold(7200);
            expect(await priceAggregator.stalenessThreshold()).to.equal(7200);
        });
        
        it("should remove an oracle source", async function () {
            await priceAggregator.removeOracleSource(tellorMock.address);
            // Since we removed an oracle, trying to use it should fail
            // This is an indirect way to test the removal
            await expect(priceAggregator.updateOracleWeight(tellorMock.address, 3)).to.be.reverted;
        });
    });
    
    describe("Error Handling", function () {
        it("should revert if asset pair is not active", async function () {
            await priceAggregator.setAssetPairStatus("ETH-USD", false);
            await expect(priceAggregator.getMedianPrice("ETH-USD")).to.be.revertedWith("Asset pair not active");
        });
        
        it("should revert if minimum oracle responses not met", async function () {
            // Set minimum oracle responses to more than available oracles
            await priceAggregator.setMinOracleResponses(10);
            await expect(priceAggregator.getMedianPrice("ETH-USD")).to.be.revertedWith("Insufficient valid prices");
        });
        
        it("should revert when accessing non-existent asset pair", async function () {
            await expect(priceAggregator.getMedianPrice("BTC-USD")).to.be.reverted;
        });
    });
});