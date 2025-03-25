const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
  
    // For testing on Sepolia we'll use actual Chainlink addresses
    // and mock addresses for other oracles
    const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const CHAINLINK_BTC_USD_SEPOLIA = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43";
    
    // Deploy mock oracles for other price sources
    console.log("Deploying mock oracles...");
    
    const API3Mock = await hre.ethers.getContractFactory("API3Mock");
    const api3Mock = await API3Mock.deploy(ethers.utils.parseEther("3000")); // ETH price $3000
    await api3Mock.deployed();
    console.log("API3Mock deployed to:", api3Mock.address);
    
    const TellorMock = await hre.ethers.getContractFactory("TellorMock");
    const tellorMock = await TellorMock.deploy(ethers.utils.parseEther("3000")); // ETH price $3000
    await tellorMock.deployed();
    console.log("TellorMock deployed to:", tellorMock.address);
    
    const UniswapV3Mock = await hre.ethers.getContractFactory("UniswapV3Mock");
    const uniswapV3Mock = await UniswapV3Mock.deploy(100000); // Some tick value
    await uniswapV3Mock.deployed();
    console.log("UniswapV3Mock deployed to:", uniswapV3Mock.address);
    
    // Configure oracle sources
    const sources = [
        { 
            oracle: CHAINLINK_ETH_USD_SEPOLIA, 
            oracleType: 0, // Chainlink
            weight: 2,
            heartbeatSeconds: 3600,
            description: "Chainlink ETH/USD",
            decimals: 8
        },
        { 
            oracle: uniswapV3Mock.address, 
            oracleType: 1, // Uniswap
            weight: 1,
            heartbeatSeconds: 3600,
            description: "Uniswap ETH/USD",
            decimals: 18
        },
        { 
            oracle: tellorMock.address, 
            oracleType: 2, // Tellor
            weight: 1,
            heartbeatSeconds: 3600,
            description: "Tellor ETH/USD",
            decimals: 18
        },
        { 
            oracle: api3Mock.address, 
            oracleType: 3, // API3
            weight: 1,
            heartbeatSeconds: 3600,
            description: "API3 ETH/USD",
            decimals: 18
        }
    ];
    
    // Deploy PriceAggregator
    console.log("Deploying PriceAggregator...");
    const PriceAggregator = await hre.ethers.getContractFactory("PriceAggregator");
    const priceAggregator = await PriceAggregator.deploy(sources);
    await priceAggregator.deployed();
    console.log("PriceAggregator deployed to:", priceAggregator.address);
    
    // Add asset pairs
    console.log("Adding asset pairs...");
    await priceAggregator.addAssetPair(
        "ETH-USD",
        "ETH",
        "USD",
        [
            CHAINLINK_ETH_USD_SEPOLIA,
            uniswapV3Mock.address,
            tellorMock.address,
            api3Mock.address
        ]
    );
    console.log("ETH-USD pair added");
    
    await priceAggregator.addAssetPair(
        "BTC-USD",
        "BTC",
        "USD",
        [CHAINLINK_BTC_USD_SEPOLIA]
    );
    console.log("BTC-USD pair added");
    
    console.log("Deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });