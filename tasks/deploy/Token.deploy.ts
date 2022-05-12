import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

import { Token, Token__factory } from "../../typechain";

task("deploy:Token").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const TK1Factory: Token__factory = <Token__factory>await ethers.getContractFactory("Token");
  const TK1: Token = <Token>await TK1Factory.deploy("Token", "TK1");
  await TK1.deployed();
  console.log("TK1 deployed to: ", TK1.address);
});
