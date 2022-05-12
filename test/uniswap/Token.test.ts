import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { Token, Token__factory } from "../../typechain";

describe("Token Tests", function () {
  let TokenContract: Token;
  let TokenFactory: Token__factory;

  let user: SignerWithAddress;
  let bob: SignerWithAddress;

  before(async function () {
    [user, bob] = await ethers.getSigners();
    TokenFactory = (await ethers.getContractFactory("Token", user)) as Token__factory;
  });

  beforeEach(async () => {
    TokenContract = await TokenFactory.deploy("Token1", "TK1");
  });

  it("Deploys correctly", async () => {});

  it("Mint", async () => {
    await expect(TokenContract.mint(bob.address, 10))
      .to.emit(TokenContract, "Transfer")
      .withArgs(ethers.constants.AddressZero, bob.address, 10);
    expect(await TokenContract.balanceOf(bob.address)).that.be.equal(10);
  });

  it("Burn", async () => {
    await expect(TokenContract.mint(bob.address, 10))
      .to.emit(TokenContract, "Transfer")
      .withArgs(ethers.constants.AddressZero, bob.address, 10);
    expect(await TokenContract.balanceOf(bob.address)).that.be.equal(10);

    await expect(TokenContract.burn(bob.address, 10))
      .to.emit(TokenContract, "Transfer")
      .withArgs(bob.address, ethers.constants.AddressZero, 10);
    expect(await TokenContract.balanceOf(bob.address)).that.be.equal(0);
  });
});
