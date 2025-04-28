async function main() {
    const [deployer] = await ethers.getSigners();
  
    // Sepolia Uniswap V3 Factory
    const factory = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
  
    // 1) Deploy our Uniswap wrapper (e.g. 30-minute TWAP)
    const UniOracle = await ethers.getContractFactory("UniswapV3OracleSimple");
    const uniOracle = await UniOracle.deploy(factory, 1800);
    await uniOracle.deployed();
  
    // 2) Deploy the PriceAggregator
    const Aggregator = await ethers.getContractFactory("PriceAggregator");
    const aggregator = await Aggregator.deploy(
      [],                    // no initial sources
      oracleLibAddress,
      twapCalcAddress
    );
    await aggregator.deployed();
  
    // 3) Add the Uniswap source; oracleType = 1 for Uniswap (per your struct) 
    await aggregator.addOracleSource({
      oracle: uniOracle.address,
      oracleType: 1,
      weight: ethers.utils.parseUnits("1", 18),
      heartbeatSeconds: 3600,
      description: "ETH/USD Sepolia UniswapV3",
      decimals: 18
    });
    // 4) Register the ETH/USD pair to use only this source
    await aggregator.addAssetPair(
      "ETH-USD",
      "ETH",
      "USD",
      [uniOracle.address]
    );
  
    console.log("Setup complete:");
    console.log(" • UniswapOracle:", uniOracle.address);
    console.log(" • Aggregator:", aggregator.address);
  }
  
  main();
  