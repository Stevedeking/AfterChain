import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy AfterchainRegistry to Etherlink Ghostnet.
 *
 * Usage:
 *   cd contracts
 *   npx hardhat run scripts/deploy.ts --network etherlink
 *
 * After deployment, copy the registry address into:
 *   src/react-app/lib/contracts.ts  →  REGISTRY_ADDRESS
 */
async function main() {
     const [deployer] = await ethers.getSigners();

     console.log("=".repeat(60));
     console.log("Afterchain Deployment");
     console.log("=".repeat(60));
     console.log(`Deployer:  ${deployer.address}`);
     console.log(`Network:   ${(await ethers.provider.getNetwork()).name}`);
     console.log(`Chain ID:  ${(await ethers.provider.getNetwork()).chainId}`);

     const balance = await ethers.provider.getBalance(deployer.address);
     console.log(`Balance:   ${ethers.formatEther(balance)} ETH`);
     console.log("-".repeat(60));

     // Deploy AfterchainRegistry
     // (AfterchainWill contracts are deployed per-user via registry.deployWill())
     console.log("Deploying AfterchainRegistry...");
     const Registry = await ethers.getContractFactory("AfterchainRegistry");
     const registry = await Registry.deploy();
     await registry.waitForDeployment();

     const registryAddress = await registry.getAddress();
     console.log(`AfterchainRegistry deployed to: ${registryAddress}`);

     // Write deployment info to a JSON file for reference
     const deploymentInfo = {
          network: "etherlink-ghostnet",
          chainId: 128123,
          deployedAt: new Date().toISOString(),
          deployer: deployer.address,
          contracts: {
               AfterchainRegistry: registryAddress,
          },
     };

     const outPath = path.join(__dirname, "../deployments.json");
     fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
     console.log(`\nDeployment info saved to: contracts/deployments.json`);

     console.log("\n" + "=".repeat(60));
     console.log("NEXT STEP:");
     console.log(`Open src/react-app/lib/contracts.ts and set:`);
     console.log(`  REGISTRY_ADDRESS = "${registryAddress}"`);
     console.log("=".repeat(60));
}

main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
});