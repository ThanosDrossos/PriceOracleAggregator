const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceAggregator", function () {
    let PriceAggregator;
    let priceAggregator;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        const OracleSource = [
            { oracle: "0xChainlinkMockAddress", oracleType: 0, weight: 1 },
            { oracle: "0xAPI3MockAddress", oracleType: 1, weight: 1 },
            { oracle: "0xTellorMockAddress", oracleType: 2, weight: 1 },
            { oracle: "0xUniswapV3MockAddress", oracleType: 3, weight: 1 }
        ];

        PriceAggregator = await ethers.getContractFactory("PriceAggregator");
        priceAggregator = await PriceAggregator.deploy(OracleSource);
        await priceAggregator.deployed();
    });

    it("should fetch prices from all sources", async function () {
        const medianPrice = await priceAggregator.getMedianPrice();
        const weightedPrice = await priceAggregator.getWeightedPrice();

        expect(medianPrice).to.be.a("number");
        expect(weightedPrice).to.be.a("number");
    });

    it("should revert if no weights are provided", async function () {
        const emptyOracleSource = [];
        const PriceAggregatorEmpty = await ethers.getContractFactory("PriceAggregator");
        await expect(PriceAggregatorEmpty.deploy(emptyOracleSource)).to.be.revertedWith("No weight");
    });

    it("should correctly aggregate prices", async function () {
        const weightedPrice = await priceAggregator.getWeightedPrice();
        expect(weightedPrice).to.be.greaterThan(0);
    });

    // Additional tests for individual oracle sources can be added here
});