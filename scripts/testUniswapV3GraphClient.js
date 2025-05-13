// Import the correct addresses from the addresses.js file
const { 
  WBTC_USDC_POOL, 
  USDC_WETH_POOL, // Changed from WETH_USDC_POOL to USDC_WETH_POOL
  UNI_USDC_POOL    
} = require('./addresses');

require('dotenv').config();

// Read API key from environment variables
const API_KEY = process.env.THEGRAPH_API_KEY;
if (!API_KEY) {
  console.warn('Warning: THEGRAPH_API_KEY environment variable is not set. API requests may fail.');
}

// The Graph's Uniswap V3 subgraph endpoint
const GRAPH_ENDPOINT = `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`;

async function runTests() {
  try {
    console.log('Testing UniswapV3GraphClient...');
    console.log('='.repeat(50));
    
    // Dynamically import the client module
    const UniswapV3GraphClient = require('./UniswapV3GraphClient');
    
    // Create a client instance
    const client = new UniswapV3GraphClient(GRAPH_ENDPOINT);
    
    // IMPORTANT: Update the poolMap BEFORE calling any methods
    client.poolMap = {
      WBTC: WBTC_USDC_POOL,
      WETH: USDC_WETH_POOL, // Use USDC_WETH_POOL since that's what's defined in addresses.js
      LINK: UNI_USDC_POOL   // Use UNI_USDC_POOL for LINK pool
    };
    
    // Test 1: Fetch pool data by token symbol
    console.log('\nTest 1: Fetch pool data by token symbol (WETH)');
    console.log('-'.repeat(50));
    const wethPoolData = await client.fetchPoolDataByTokenSymbol('WETH');
    prettyPrint('WETH Pool Data', wethPoolData);
    
    // Test 2: Fetch pool data directly by ID
    console.log('\nTest 2: Fetch pool data by pool ID (WBTC/USDC)');
    console.log('-'.repeat(50));
    const wbtcPoolData = await client.fetchPoolData(WBTC_USDC_POOL);
    prettyPrint('WBTC/USDC Pool Data', wbtcPoolData);
    
    // Test 3: Fetch token price
    console.log('\nTest 3: Fetch token price (LINK/USDC)');
    console.log('-'.repeat(50));
    // Use LINK_USDC_POOL if defined, otherwise fallback to UNI_USDC_POOL
    const linkOrUniPool = UNI_USDC_POOL;
    const linkPrice = await client.fetchTokenPrice(linkOrUniPool);
    prettyPrint('LINK Price Data', linkPrice);
    
    // Test 4: Error handling - Invalid token symbol
    console.log('\nTest 4: Error handling - Invalid token symbol');
    console.log('-'.repeat(50));
    try {
      await client.fetchPoolDataByTokenSymbol('INVALID');
    } catch (error) {
      console.log('✅ Expected error caught:', error.message);
    }
    
    console.log('\n='.repeat(50));
    console.log('All tests completed!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Helper function to format and print results
function prettyPrint(label, data) {
  console.log(`${label}:`);
  
  if (data.humanReadablePrice) {
    console.log(`📊 Price: ${data.humanReadablePrice} USD`);
  }
  
  if (data.token0) {
    console.log(`🪙 Token0: ${data.token0.symbol} (${data.token0.id})`);
    console.log(`🪙 Token1: ${data.token1.symbol} (${data.token1.id})`);
  }
  
  if (data.feeTier) {
    console.log(`💸 Fee Tier: ${data.feeTier / 10000}%`);
  }
  
  if (data.volumeUSD) {
    console.log(`📈 Volume USD: $${Number(data.volumeUSD).toLocaleString()}`);
  }
  
  console.log('\nRaw data:');
  console.log(JSON.stringify(data, null, 2));
}

// Run the tests
runTests().then(() => {
  console.log('Tests execution completed.');
}).catch(err => {
  console.error('Tests execution failed:', err);
});
