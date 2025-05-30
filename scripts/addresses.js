// DO NOT CHANGE THIS FILE UNLESS YOU KNOW WHAT YOU ARE DOING
// This file contains the addresses of various contracts and tokens used in the project.
// It is important to keep this file consistent and up-to-date.
// // TELLOR

// Contracts

const tellorContract = "0x199839a4907ABeC8240D119B606C98c405Bb0B33";
const tellorAdapterContract =	"0x7950db13cc37774614b0aa406e42a4c4f0bf26a6";

const tellorToken = "0x80fc34a2f9FfE86F41580F47368289C402DEc660";
const tellorOracle = "0xB19584Be015c04cf6CFBF6370Fe94a58b7A38830"; //tellor flex

// QueryIDS
const tellorQueryETHUSD = "0x83a7f3d48786ac2667503a61e8c415438ed2922eb86a2906e4ee66d9a2ce4992";
const tellorQueryUNIUSD = "0xb44a64a8c4f1006949b8f471594074e97c5f30ff86acffb2d2a13c00f3aa2da0";
const tellorQueryLINKUSD = "0xc138a64c42a40eb5ba8f64de1e62884a0e4259d8c34872c5d5d52a8fa426d697";
const tellorQueryBTCUSD = "0xa6f013ee236804827b77696d350e9f0ac3e879328f2a3021d473a0b778ad78ac";

// UNISWAP v3
// Contracts
const uniswapV3Factory = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
const uniswapV3NonFungiblePositionManager = "0x1238536071E1c677A632429e3655c799b22cDA52";

const queryURL = "https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";

// Token addresses for Uniswap pool lookups (mainnet!)
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const wbtcAddress = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
const linkAddress = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const WBTC_USDC_POOL = "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35";
const USDC_WETH_POOL = "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36";
const UNI_USDC_POOL = "0x3470447f3CecfFAc709D3e783A307790b0208d60";

// CHAINLINK
const chainlinkOperatorFactory = "0x447Fd5eC2D383091C22B8549cb231a3bAD6d3fAf";

const chainlinkBTCUSD = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43";
const chainlinkETHUSD = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const chainlinkLINKUSD = "0xc59E3633BAAC79493d908e63626716e204A45EdF";
// Heartbeat: 3600 seconds, all 8 dec, 1% deviation


// API3

API3ReaderProxyETHUSD = "0x5b0cf2b36a65a6BB085D501B971e4c102B9Cd473";
API3ReaderProxyBTCUSD = "0xCAc4d304032a46C8D0947396B7cBb07986826A36";
API3ReaderProxyUNIUSD = "0x9871FB53FFB5a7d38ef094390E450b90d705C83B";


// Export all variables for use in other scripts
module.exports = {
    // Tellor
    tellorContract,
    tellorAdapterContract,
    tellorQueryETHUSD,
    tellorQueryUNIUSD,
    tellorQueryLINKUSD,
    tellorQueryBTCUSD,
    tellorToken,
    tellorOracle,
    
    // Uniswap
    uniswapV3Factory,
    uniswapV3NonFungiblePositionManager,
    queryURL,
    wethAddress,
    wbtcAddress,
    linkAddress,
    usdcAddress,
    WBTC_USDC_POOL,
    USDC_WETH_POOL,
    UNI_USDC_POOL,
    
    // Chainlink
    chainlinkOperatorFactory,
    chainlinkBTCUSD,
    chainlinkETHUSD,
    chainlinkLINKUSD,
    
    // API3
    API3ReaderProxyETHUSD,
    API3ReaderProxyBTCUSD,
    API3ReaderProxyUNIUSD

};