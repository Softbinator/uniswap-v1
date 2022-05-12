import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

import { Factory, Factory__factory } from "../../typechain";

task("deploy:Factory").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const FactoryFactory: Factory__factory = <Factory__factory>await ethers.getContractFactory("Factory");
  const Factory: Factory = <Factory>await FactoryFactory.deploy();
  await Factory.deployed();
  console.log("Factory deployed to: ", Factory.address);
});
