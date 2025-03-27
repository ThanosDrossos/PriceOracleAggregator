const { run } = require("hardhat");

async function main() {
    const contractName = "PriceAggregator";
    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId;

    const deployedContracts = await hre.deployments.all();
    const contractAddress = deployedContracts[contractName].address;

    console.log(`Verifying contract ${contractName} at address: ${contractAddress}`);

    await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [], // Add constructor arguments if any
    });

    console.log("Verification complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });