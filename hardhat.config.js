require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    hardhat: {
      // Uncomment this for mainnet forking
      // forking: {
      //   url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      //   blockNumber: 18782470 // Optional: pin to a specific block for deterministic testing
      // }
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  mocha: {
    timeout: 100000 // Increase timeout for tests
  }
};