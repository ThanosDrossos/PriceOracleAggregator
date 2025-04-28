const axios = require('axios');
const { ethers } = require('ethers');

class UniswapV3GraphClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async fetchPoolData(tokenA, tokenB, timeframe = 86400) {
    const query = `
      query {
        pools(where: {
          token0_in: ["${tokenA.toLowerCase()}", "${tokenB.toLowerCase()}"],
          token1_in: ["${tokenA.toLowerCase()}", "${tokenB.toLowerCase()}"]
        }, orderBy: volumeUSD, orderDirection: desc, first: 1) {
          id
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
          token0Price
          token1Price
          volumeUSD
          feeTier
          sqrtPrice
          liquidity
          poolDayData(first: 1, orderBy: date, orderDirection: desc) {
            close
            open
            high
            low
            volumeUSD
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        this.endpoint,
        { query },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }

      const pools = response.data.data.pools;
      if (!pools || pools.length === 0) {
        throw new Error(`No pools found for token pair ${tokenA}/${tokenB}`);
      }

      return this.processPoolData(pools[0], tokenA, tokenB);
    } catch (error) {
      console.error('Failed to fetch Uniswap V3 data:', error);
      throw error;
    }
  }

  processPoolData(pool, tokenA, tokenB) {
    // Determine which token is which in the pool
    const isToken0A = pool.token0.id.toLowerCase() === tokenA.toLowerCase();
    
    // Get the price based on which token we're pricing
    let price;
    if (isToken0A) {
      price = pool.token1Price; // If tokenA is token0, we want the token1Price
    } else {
      price = pool.token0Price; // If tokenA is token1, we want the token0Price
    }

    // Convert price to Wei format (18 decimals)
    const priceInWei = ethers.utils.parseUnits(
      price.toString(), 
      18
    );

    return {
      poolId: pool.id,
      price: priceInWei.toString(),
      humanReadablePrice: price,
      feeTier: pool.feeTier,
      volumeUSD: pool.volumeUSD,
      token0: {
        id: pool.token0.id,
        symbol: pool.token0.symbol,
        decimals: pool.token0.decimals
      },
      token1: {
        id: pool.token1.id,
        symbol: pool.token1.symbol,
        decimals: pool.token1.decimals
      }
    };
  }
}

module.exports = UniswapV3GraphClient;