const { ethers } = require('hardhat');
const UniswapV3GraphClient = require('./UniswapV3GraphClient');
const addresses = require('./addresses');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running UniswapV3 price update script with account:", deployer.address);

  // Get the deployed adapter address from command line or use environment variable
  const adapterAddress = process.env.UNISWAP_ADAPTER_ADDRESS || process.argv[2];
  if (!adapterAddress) {
    console.error("Please provide the UniswapV3GraphAdapter address as an argument or set UNISWAP_ADAPTER_ADDRESS in .env");
    process.exit(1);
  }
  
  console.log(`Using UniswapV3GraphAdapter at: ${adapterAddress}`);
  
  // Load the UniswapV3GraphAdapter contract
  const adapter = await ethers.getContractAt("UniswapV3GraphAdapter", adapterAddress);

  // Initialize the Graph client
  const graphClient = new UniswapV3GraphClient(addresses.queryURL);

  // Define the pairs we want to update
  const pairs = [
    {
      name: "ETH-USDC",
      tokenA: addresses.wethAddress,
      tokenB: addresses.usdcAddress,
      fee: 3000 // 0.3% fee tier
    },
    {
      name: "BTC-USDC",
      tokenA: addresses.wbtcAddress,
      tokenB: addresses.usdcAddress,
      fee: 3000 // 0.3% fee tier
    },
    {
      name: "LINK-USDC",
      tokenA: addresses.linkAddress,
      tokenB: addresses.usdcAddress,
      fee: 3000 // 0.3% fee tier
    }
  ];

  // Update each pair
  for (const pair of pairs) {
    console.log(`Fetching data for ${pair.name}...`);
    
    try {
      // Fetch data from TheGraph
      const poolData = await graphClient.fetchPoolData(pair.tokenA, pair.tokenB);
      
      console.log(`${pair.name} price from Uniswap: ${poolData.humanReadablePrice}`);
      
      // Update the on-chain adapter
      console.log(`Updating ${pair.name} price on-chain...`);
      const tx = await adapter.updatePrice(
        pair.tokenA,
        pair.tokenB,
        pair.fee,
        poolData.price, // Already in correct format from the client
        pair.name,
        poolData.liquidity || "0"
      );
      
      await tx.wait();
      console.log(`${pair.name} price updated successfully! Tx: ${tx.hash}`);
      
      // Also update tick cumulatives to produce a valid TWAP
      // We calculate values that will result in the correct price when processed by TWAPCalculator
      const price = parseFloat(poolData.humanReadablePrice);
      const tick = Math.log(Math.sqrt(price)) / Math.log(1.0001);
      
      const tickCumulative1 = Math.floor(tick * 10000);
      const tickCumulative2 = tickCumulative1 + Math.floor(tick * 1800); // 1800 seconds (30 min) of accumulated ticks
      
      console.log(`Updating tick cumulatives with values: ${tickCumulative1}, ${tickCumulative2}`);
      const tickTx = await adapter.updateTickCumulatives(
        tickCumulative1,
        tickCumulative2
      );
      
      await tickTx.wait();
      console.log(`Tick cumulatives updated successfully! Tx: ${tickTx.hash}`);
      
    } catch (error) {
      console.error(`Error updating ${pair.name}:`, error);
    }
  }
  
  console.log("Price update script completed!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });