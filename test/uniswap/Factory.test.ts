import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { Exchange, Exchange__factory, Factory, Factory__factory, Token, Token__factory } from "../../typechain";

describe("Exchange Tests Liquidity", function () {
  let ExchangeContract: Exchange;
  let Token: Token;
  let factory: Factory;
  let exchangeFactory: Exchange__factory;
  let tokenFactory: Token__factory;
  let factoryFactory: Factory__factory;

  let user: SignerWithAddress;
  let bob: SignerWithAddress;

  before(async function () {
    [user, bob] = await ethers.getSigners();
    exchangeFactory = (await ethers.getContractFactory("Exchange", user)) as Exchange__factory;
    tokenFactory = (await ethers.getContractFactory("Token", user)) as Token__factory;
    factoryFactory = (await ethers.getContractFactory("Factory", user)) as Factory__factory;
  });

  beforeEach(async () => {
    Token = await tokenFactory.deploy("Token1", "TK1");
    factory = await factoryFactory.deploy();
    // let exchangeAddress = await factory.createExchange(token.address);
    ExchangeContract = await exchangeFactory.deploy(Token.address);
  });

  it("Create Exchange", async () => {
    await expect(factory.createExchange(Token.address))
      .to.emit(factory, "ExchangeCreated")
      .withArgs("0xC455c6402614eB2c90197e7034345AF789B1e4Bd");
  });

  it("Create Exchange with address 0 as token address", async () => {
    await expect(factory.createExchange(ethers.constants.AddressZero)).to.be.revertedWith("InvalidTokenAddress");
  });

  it("Create Exchange with existing token address", async () => {
    await expect(factory.createExchange(Token.address))
      .to.emit(factory, "ExchangeCreated")
      .withArgs("0x286dc040183F0E19a878Ae76b53F175516FB0E2e");
    await expect(factory.createExchange(Token.address)).to.be.revertedWith("AlreadyExistAnExchangeForThisToken");
  });
});
