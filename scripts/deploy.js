const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Deploy utility contracts first
  console.log("Deploying OracleLib...");
  const OracleLib = await hre.ethers.getContractFactory("OracleLib");
  const oracleLib = await OracleLib.deploy();
  await oracleLib.deploymentTransaction().wait(1);
  console.log("OracleLib deployed to:", await oracleLib.getAddress());
  
  console.log("Deploying TWAPCalculator...");
  const TWAPCalculator = await hre.ethers.getContractFactory("TWAPCalculator");
  const twapCalculator = await TWAPCalculator.deploy();
  await twapCalculator.deploymentTransaction().wait(1);
  console.log("TWAPCalculator deployed to:", await twapCalculator.getAddress());
  
  // Use real oracle addresses for Sepolia testnet
  const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  
  // For other oracles, you might need to deploy mocks if they don't exist on testnet
  // Deploy mock oracles for other price sources
  console.log("Deploying mock oracles...");
  
  const API3Mock = await hre.ethers.getContractFactory("API3Mock");
  const api3Mock = await API3Mock.deploy(ethers.parseUnits("3000", 18)); // ETH price $3000
  await api3Mock.deploymentTransaction().wait(1);
  console.log("API3Mock deployed to:", await api3Mock.getAddress());
  
  const TellorMock = await hre.ethers.getContractFactory("TellorMock");
  const tellorMock = await TellorMock.deploy(ethers.parseUnits("3000", 18)); // ETH price $3000
  await tellorMock.deploymentTransaction().wait(1);
  console.log("TellorMock deployed to:", await tellorMock.getAddress());
  
  const UniswapV3Mock = await hre.ethers.getContractFactory("UniswapV3Mock");
  const uniswapV3Mock = await UniswapV3Mock.deploy(100000); // Some tick value
  await uniswapV3Mock.deploymentTransaction().wait(1);
  console.log("UniswapV3Mock deployed to:", await uniswapV3Mock.getAddress());
  
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
      oracle: await uniswapV3Mock.getAddress(), 
      oracleType: 1, // Uniswap
      weight: 1,
      heartbeatSeconds: 3600,
      description: "Uniswap ETH/USD",
      decimals: 18
    },
    { 
      oracle: await tellorMock.getAddress(), 
      oracleType: 2, // Tellor
      weight: 1,
      heartbeatSeconds: 3600,
      description: "Tellor ETH/USD",
      decimals: 18
    },
    { 
      oracle: await api3Mock.getAddress(), 
      oracleType: 3, // API3
      weight: 1,
      heartbeatSeconds: 3600,
      description: "API3 ETH/USD",
      decimals: 18
    }
  ];
  
  // Deploy PriceAggregator with utility contracts
  console.log("Deploying PriceAggregator...");
  const PriceAggregator = await hre.ethers.getContractFactory("PriceAggregator");
  const priceAggregator = await PriceAggregator.deploy(
    sources, 
    await oracleLib.getAddress(),
    await twapCalculator.getAddress()
  );
  await priceAggregator.deploymentTransaction().wait(1);
  console.log("PriceAggregator deployed to:", await priceAggregator.getAddress());
  
  // Add asset pairs
  console.log("Adding asset pairs...");
  await priceAggregator.addAssetPair(
    "ETH-USD",
    "ETH",
    "USD",
    [
      CHAINLINK_ETH_USD_SEPOLIA,
      await uniswapV3Mock.getAddress(),
      await tellorMock.getAddress(),
      await api3Mock.getAddress()
    ]
  );
  console.log("ETH-USD pair added");
  
  console.log("Deployment complete!");
  
  // Verify contracts on Etherscan
  console.log("Verifying contracts on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: await oracleLib.getAddress(),
      constructorArguments: [],
    });
    await hre.run("verify:verify", {
      address: await twapCalculator.getAddress(),
      constructorArguments: [],
    });
    await hre.run("verify:verify", {
      address: await priceAggregator.getAddress(),
      constructorArguments: [
        sources,
        await oracleLib.getAddress(),
        await twapCalculator.getAddress()
      ],
    });
    console.log("Verification complete!");
  } catch (error) {
    console.error("Error during verification:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });