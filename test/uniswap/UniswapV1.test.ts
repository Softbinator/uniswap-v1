import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { Exchange, Exchange__factory } from "../../typechain";

describe("Exchange Tests", function () {
  let Exchange: Exchange;
  //   let STHX: SynthetixToken;
  let ExchangeFactory: Exchange__factory;
  //   let SynthetixTokenFactory: SynthetixToken__factory;

  let user: SignerWithAddress;
  let bob: SignerWithAddress;

  before(async function () {
    [user, bob] = await ethers.getSigners();
    ExchangeFactory = (await ethers.getContractFactory("SynthetixContractStaking", user)) as Exchange__factory;
    // SynthetixTokenFactory = (await ethers.getContractFactory("SynthetixToken", user)) as SynthetixToken__factory;
  });

  beforeEach(async () => {
    // STHX = await SynthetixTokenFactory.deploy("SynthetixToken", "STHX");
    Exchange = await ExchangeFactory.deploy("LpToken", "LP");
  });

  it("Deploys correctly", async () => {});
});
