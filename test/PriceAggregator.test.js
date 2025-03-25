const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceAggregator", function () {
    let PriceAggregator;
    let priceAggregator;
    let owner, user;
    let chainlinkMock, api3Mock, tellorMock, uniswapV3Mock;
    let twapCalculator, oracleLib;
    
    // Setup mock prices using ethers.parseUnits for proper BigNumber handling
    const ETH_PRICE_USD = 3000;
    // Use proper BigNumber handling for large numbers
    const ETH_PRICE_CHAINLINK = ethers.parseUnits(ETH_PRICE_USD.toString(), 8); // 8 decimals
    const ETH_PRICE_API3 = ethers.parseUnits(ETH_PRICE_USD.toString(), 18);     // 18 decimals
    const ETH_PRICE_TELLOR = ethers.parseUnits(ETH_PRICE_USD.toString(), 18);   // 18 decimals
    const UNISWAP_TICK_CUMULATIVE = 100000; // Small enough to work as a regular number
    
    beforeEach(async function () {
        // Print a message so we can see where we are in the test execution
        console.log("Starting test setup...");
        
        [owner, user] = await ethers.getSigners();
        
        console.log("Deploying mock oracles...");
        // Deploy mock oracles
        const ChainlinkMock = await ethers.getContractFactory("ChainlinkMock");
        chainlinkMock = await ChainlinkMock.deploy(ETH_PRICE_CHAINLINK, "ETH / USD", 8);
        await chainlinkMock.getAddress(); // Ensure deployment is complete
        console.log("ChainlinkMock deployed at:", await chainlinkMock.getAddress());
        
        const API3Mock = await ethers.getContractFactory("API3Mock");
        api3Mock = await API3Mock.deploy(ETH_PRICE_API3);
        await api3Mock.getAddress(); // Ensure deployment is complete
        console.log("API3Mock deployed at:", await api3Mock.getAddress());
        
        const TellorMock = await ethers.getContractFactory("TellorMock");
        tellorMock = await TellorMock.deploy(ETH_PRICE_TELLOR);
        await tellorMock.getAddress(); // Ensure deployment is complete
        console.log("TellorMock deployed at:", await tellorMock.getAddress());
        
        const UniswapV3Mock = await ethers.getContractFactory("UniswapV3Mock");
        uniswapV3Mock = await UniswapV3Mock.deploy(UNISWAP_TICK_CUMULATIVE);
        await uniswapV3Mock.getAddress(); // Ensure deployment is complete
        console.log("UniswapV3Mock deployed at:", await uniswapV3Mock.getAddress());
        
        // Setup oracle sources for constructor
        const oracleSources = [
            {
                oracle: await chainlinkMock.getAddress(),
                oracleType: 0,  // Chainlink
                weight: 2,       // Higher weight for Chainlink
                heartbeatSeconds: 3600, // 1 hour heartbeat
                description: "Chainlink ETH/USD",
                decimals: 8
            },
            {
                oracle: await uniswapV3Mock.getAddress(),
                oracleType: 1,  // Uniswap
                weight: 1,
                heartbeatSeconds: 3600,
                description: "Uniswap ETH/USD",
                decimals: 18
            },
            {
                oracle: await tellorMock.getAddress(),
                oracleType: 2,  
                weight: 1,
                heartbeatSeconds: 3600,
                description: "Tellor ETH/USD",
                decimals: 18
            },
            {
                oracle: await api3Mock.getAddress(),
                oracleType: 3,  
                weight: 1,
                heartbeatSeconds: 3600,
                description: "API3 ETH/USD",
                decimals: 18
            }
        ];
        
        console.log("Deploying utility contracts...");
        // Deploy the contracts first (not as libraries)
        const TWAPCalculatorFactory = await ethers.getContractFactory("TWAPCalculator");
        twapCalculator = await TWAPCalculatorFactory.deploy();
        await twapCalculator.getAddress(); // Wait for deployment to complete
        const twapAddress = await twapCalculator.getAddress();
        console.log("TWAPCalculator contract deployed at:", twapAddress);

        const OracleLibFactory = await ethers.getContractFactory("OracleLib");
        oracleLib = await OracleLibFactory.deploy();
        await oracleLib.getAddress(); // Wait for deployment to complete
        const oracleAddress = await oracleLib.getAddress();
        console.log("OracleLib contract deployed at:", oracleAddress);
        
        console.log("Deploying PriceAggregator...");
        // Deploy the PriceAggregator contract with the utility contracts
        const PriceAggregatorFactory = await ethers.getContractFactory("PriceAggregator");
        // Pass the addresses of OracleLib and TWAPCalculator to the constructor
        priceAggregator = await PriceAggregatorFactory.deploy(
            oracleSources,
            oracleAddress,
            twapAddress
        );
        await priceAggregator.getAddress(); // Ensure deployment is complete
        console.log("PriceAggregator deployed at:", await priceAggregator.getAddress());
        
        console.log("Adding asset pair...");
        // Add an asset pair
        await priceAggregator.addAssetPair(
            "ETH-USD",
            "ETH",
            "USD",
            [
                await chainlinkMock.getAddress(),
                await uniswapV3Mock.getAddress(),
                await tellorMock.getAddress(),
                await api3Mock.getAddress()
            ]
        );
        console.log("Asset pair added!");
    });
    
    describe("Basic Functionality", function () {
        it("should have correct initial configuration", async function () {
            expect(await priceAggregator.getSupportedPairsCount()).to.equal(1);
            expect(await priceAggregator.minOracleResponses()).to.equal(1);
            expect(await priceAggregator.stalenessThreshold()).to.equal(3600);
        });
        
        // More tests...
    });
});