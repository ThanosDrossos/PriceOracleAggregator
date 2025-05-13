const { WBTC_USDC_POOL, USDC_WETH_POOL, UNI_USDC_POOL } = require('./addresses');

class UniswapV3GraphClient {
  constructor(endpoint, apiKey = '') {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.poolMap = {
      WBTC: WBTC_USDC_POOL,
      WETH: USDC_WETH_POOL,
      LINK: UNI_USDC_POOL
    };
  }

  async fetchPoolDataByTokenSymbol(tokenSymbol) {
    const poolId = this.poolMap[tokenSymbol];
    if (!poolId) {
      throw new Error(`No pool ID defined for token symbol: ${tokenSymbol}`);
    }
    return this.fetchPoolData(poolId);
  }

  async fetchPoolData(poolId) {
    // Dynamically import graphql-request
    const { request, gql } = await import('graphql-request');
    
    const query = gql`
      query MyQuery {
        pool(id: "${poolId.toLowerCase()}") {
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
        }
      }
    `;

    const headers = {};
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    try {
      const data = await request(this.endpoint, query, {}, headers);
      
      const pool = data.pool;
      if (!pool) {
        throw new Error(`No pool found with ID ${poolId}`);
      }

      return this.processPoolData(pool);
    } catch (error) {
      console.error('Failed to fetch Uniswap V3 data:', error);
      throw error;
    }
  }

  // Simplified query version that only gets token1Price
  async fetchTokenPrice(poolId) {
    // Dynamically import graphql-request and ethers
    const [gqlModule, ethersModule] = await Promise.all([
      import('graphql-request'),
      import('ethers')
    ]);
    
    const { request, gql } = gqlModule;
    
    const query = gql`
      query MyQuery {
        pool(id: "${poolId.toLowerCase()}") {
          token1Price
          token1 {
            id
          }
        }
      }
    `;

    const headers = {};
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    try {
      const data = await request(this.endpoint, query, {}, headers);
      
      const pool = data.pool;
      if (!pool) {
        throw new Error(`No pool found with ID ${poolId}`);
      }

      // Convert price to Wei format using the correct ethers v6 format
      const priceInWei = ethersModule.parseUnits(
        pool.token1Price.toString(), 
        18
      );

      return {
        price: priceInWei.toString(),
        humanReadablePrice: pool.token1Price,
        token1Id: pool.token1.id
      };
    } catch (error) {
      console.error('Failed to fetch token price:', error);
      throw error;
    }
  }

  async processPoolData(pool) {
    // Dynamically import ethers with corrected usage for v6
    const ethersModule = await import('ethers');
    
    // The price corresponds to the price of token0 in terms of token1 (USDC)
    const price = pool.token1Price;

    try {
      // Convert price to Wei format using the correct ethers v6 format
      const priceInWei = ethersModule.parseUnits(
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
    } catch (error) {
      console.error('Error processing pool data:', error);
      
      // Return data without the price conversion as a fallback
      return {
        poolId: pool.id,
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
}

module.exports = UniswapV3GraphClient;