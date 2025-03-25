const hre = require("hardhat");

async function main() {
    const PriceAggregator = await hre.ethers.getContractFactory("PriceAggregator");

    // Sepolia testnet addresses
    const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const CHAINLINK_BTC_USD_SEPOLIA = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43";
    
    // These are placeholders - you would need to deploy mock oracles for these on Sepolia
    // or find actual instances deployed on Sepolia for testing
    const API3_ETH_USD_SEPOLIA = "YOUR_API3_MOCK_ADDRESS";
    const TELLOR_ETH_USD_SEPOLIA = "YOUR_TELLOR_MOCK_ADDRESS";
    const UNISWAP_ETH_USD_SEPOLIA = "YOUR_UNISWAP_MOCK_ADDRESS";

    const sources = [
        { 
            oracle: CHAINLINK_ETH_USD_SEPOLIA, 
            oracleType: 0, 
            weight: 2, 
            heartbeatSeconds: 3600,
            description: "Chainlink ETH/USD",
            decimals: 8
        },
        { 
            oracle: API3_ETH_USD_SEPOLIA, 
            oracleType: 3, 
            weight: 1,
            heartbeatSeconds: 3600,
            description: "API3 ETH/USD",
            decimals: 18
        },
        { 
            oracle: TELLOR_ETH_USD_SEPOLIA, 
            oracleType: 2, 
            weight: 1,
            heartbeatSeconds: 3600,
            description: "Tellor ETH/USD",
            decimals: 18
        },
        { 
            oracle: UNISWAP_ETH_USD_SEPOLIA, 
            oracleType: 1, 
            weight: 1,
            heartbeatSeconds: 3600,
            description: "Uniswap V3 ETH/USD",
            decimals: 18
        }
    ];

    const priceAggregator = await PriceAggregator.deploy(sources);
    await priceAggregator.deployed();

    console.log("PriceAggregator deployed to:", priceAggregator.address);
    
    // Set up ETH-USD asset pair
    const tx = await priceAggregator.addAssetPair(
        "ETH-USD",
        "ETH",
        "USD",
        [CHAINLINK_ETH_USD_SEPOLIA, API3_ETH_USD_SEPOLIA, TELLOR_ETH_USD_SEPOLIA, UNISWAP_ETH_USD_SEPOLIA]
    );
    await tx.wait();
    console.log("ETH-USD asset pair added");
    
    // Set up BTC-USD asset pair using just the Chainlink source
    const tx2 = await priceAggregator.addAssetPair(
        "BTC-USD",
        "BTC",
        "USD",
        [CHAINLINK_BTC_USD_SEPOLIA]
    );
    await tx2.wait();
    console.log("BTC-USD asset pair added");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });