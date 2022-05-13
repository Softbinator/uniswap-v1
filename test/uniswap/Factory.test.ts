import { Listener } from "@ethersproject/providers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers";
import { ethers } from "hardhat";

import { Exchange, Exchange__factory, Factory, Factory__factory, Token, Token__factory } from "../../typechain";

describe("Factory Tests", function () {
  let ExchangeContract: Exchange;
  let Token: Token;
  let Token2: Token;
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
    Token2 = await tokenFactory.deploy("Token2", "TK2");
    factory = await factoryFactory.deploy();
  });

  it("Create Exchange", async () => {
    await expect(factory.createExchange(Token.address)).to.emit(factory, "ExchangeCreated");
  });

  it("Create Exchange with address 0 as token address", async () => {
    await expect(factory.createExchange(ethers.constants.AddressZero)).to.be.revertedWith("InvalidTokenAddress");
  });

  it("Create Exchange with existing token address", async () => {
    await expect(factory.createExchange(Token.address)).to.emit(factory, "ExchangeCreated");
    await expect(factory.createExchange(Token.address)).to.be.revertedWith("AlreadyExistAnExchangeForThisToken");
  });

  it("Token1 to Token2 swap", async () => {
    const tx: ContractTransaction = await factory.createExchange(Token.address);
    const tx2: ContractTransaction = await factory.createExchange(Token2.address);

    const receipt: ContractReceipt = await tx.wait();
    const exchangeInfo: any = receipt.events?.filter(x => x.event == "ExchangeCreated");
    ExchangeContract = (await ethers.getContractAt("Exchange", exchangeInfo[0]["args"][0])) as Exchange;

    const receipt2: ContractReceipt = await tx2.wait();
    const exchangeInfo2: any = receipt2.events?.filter(x => x.event == "ExchangeCreated");
    const ExchangeContract2 = (await ethers.getContractAt("Exchange", exchangeInfo2[0]["args"][0])) as Exchange;

    /* ============== Add liquidity for Token1 ============== */
    await expect(Token.mint(user.address, 200))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, 200);

    await expect(Token.approve(ExchangeContract.address, "200"))
      .to.emit(Token, "Approval")
      .withArgs(user.address, ExchangeContract.address, 200);

    await expect(ExchangeContract.addLiquidity(100, { value: ethers.utils.parseEther("1") }))
      .to.emit(ExchangeContract, "LiquidityAdded")
      .withArgs(100, ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));

    /* ============== Add liquidity for Token2 ============== */
    await expect(Token2.mint(user.address, 100))
      .to.emit(Token2, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, 100);

    await expect(Token2.approve(ExchangeContract2.address, "100"))
      .to.emit(Token2, "Approval")
      .withArgs(user.address, ExchangeContract2.address, 100);

    await expect(ExchangeContract2.addLiquidity(100, { value: ethers.utils.parseEther("1") }))
      .to.emit(ExchangeContract2, "LiquidityAdded")
      .withArgs(100, ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));

    await expect(ExchangeContract.tokenToTokenSwap(10, 1, Token2.address))
      .to.emit(ExchangeContract, "TokenToToken")
      .withArgs(10);

    expect(await Token.balanceOf(user.address)).to.be.equal(90);
    expect(await Token2.balanceOf(user.address)).to.be.equal(7);
  });

  it("Token1 to Token2 swap without Token2 in the Exchange contract", async () => {
    const tx: ContractTransaction = await factory.createExchange(Token.address);
    await factory.createExchange(Token2.address);
    const receipt: ContractReceipt = await tx.wait();
    const exchangeInfo: any = receipt.events?.filter(x => x.event == "ExchangeCreated");
    ExchangeContract = (await ethers.getContractAt("Exchange", exchangeInfo[0]["args"][0])) as Exchange;

    await expect(ExchangeContract.tokenToTokenSwap(100, 10, Token2.address)).to.be.revertedWith("InvalidReserves");
  });
});
