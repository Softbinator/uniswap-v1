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

  it("Deploys correctly", async () => {
    expect(await ExchangeContract.token()).to.be.equal(Token.address);
  });

  it("Add liquidity when balance is empty", async () => {
    await expect(await Token.mint(user.address, 100))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, 100);

    await expect(await Token.approve(ExchangeContract.address, "100"))
      .to.emit(Token, "Approval")
      .withArgs(user.address, ExchangeContract.address, 100);

    await expect(ExchangeContract.addLiquidity(100, { value: ethers.utils.parseEther("1") }))
      .to.emit(ExchangeContract, "LiquidityAdded")
      .withArgs(100, ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("1"));
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(100);
    expect(await ExchangeContract.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("1"));
  });

  it("Add liquidity when balance is not empty", async () => {
    await expect(Token.mint(user.address, 100))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, 100);

    await expect(Token.approve(ExchangeContract.address, "100"))
      .to.emit(Token, "Approval")
      .withArgs(user.address, ExchangeContract.address, 100);

    await expect(ExchangeContract.addLiquidity(100, { value: ethers.utils.parseEther("1") }))
      .to.emit(ExchangeContract, "LiquidityAdded")
      .withArgs(100, ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("1"));
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(100);
    expect(await ExchangeContract.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("1"));

    await expect(Token.mint(bob.address, 200))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, bob.address, 200);

    await expect(Token.connect(bob).approve(ExchangeContract.address, "200"))
      .to.emit(Token, "Approval")
      .withArgs(bob.address, ExchangeContract.address, 200);

    await expect(ExchangeContract.connect(bob).addLiquidity(200, { value: ethers.utils.parseEther("2") }))
      .to.emit(ExchangeContract, "LiquidityAdded")
      .withArgs(200, ethers.utils.parseEther("2"), ethers.utils.parseEther("2"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("3"));
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(300);
    expect(await ExchangeContract.balanceOf(bob.address)).to.be.equal(ethers.utils.parseEther("2"));
  });

  it("Add invalid liquidity when balance is not empty", async () => {
    await expect(Token.mint(user.address, 100))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, 100);

    await expect(Token.approve(ExchangeContract.address, "100"))
      .to.emit(Token, "Approval")
      .withArgs(user.address, ExchangeContract.address, 100);

    await expect(ExchangeContract.addLiquidity(100, { value: ethers.utils.parseEther("1") }))
      .to.emit(ExchangeContract, "LiquidityAdded")
      .withArgs(100, ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("1"));
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(100);
    expect(await ExchangeContract.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("1"));

    await expect(Token.mint(bob.address, 200))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, bob.address, 200);

    await expect(Token.connect(bob).approve(ExchangeContract.address, "200"))
      .to.emit(Token, "Approval")
      .withArgs(bob.address, ExchangeContract.address, 200);

    // should revert with any value < 100
    await expect(
      ExchangeContract.connect(bob).addLiquidity(10, { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("InsufficientTokenAmount()");

    await expect(
      ExchangeContract.connect(bob).addLiquidity(99, { value: ethers.utils.parseEther("1") }),
    ).to.be.revertedWith("InsufficientTokenAmount()");

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("1"));
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(100);
    expect(await ExchangeContract.balanceOf(bob.address)).to.be.equal(ethers.utils.parseEther("0"));
    expect(await ExchangeContract.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("1"));
  });

  it("Get eth amount on invalid reserves", async () => {
    await expect(ExchangeContract.getEthAmount(10)).to.be.revertedWith("InvalidReserves");
  });
});

describe("Exchange Tests", function () {
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
    await expect(Token.mint(user.address, ethers.utils.parseEther("100")))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, ethers.utils.parseEther("100"));

    await expect(Token.approve(ExchangeContract.address, ethers.utils.parseEther("1000")))
      .to.emit(Token, "Approval")
      .withArgs(user.address, ExchangeContract.address, ethers.utils.parseEther("1000"));

    await expect(ExchangeContract.addLiquidity(ethers.utils.parseEther("100"), { value: ethers.utils.parseEther("1") }))
      .to.emit(ExchangeContract, "LiquidityAdded")
      .withArgs(ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("1"));
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(ethers.utils.parseEther("100"));
    expect(await ExchangeContract.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("1"));

    await expect(Token.mint(bob.address, ethers.utils.parseEther("200")))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, bob.address, ethers.utils.parseEther("200"));

    await expect(Token.connect(bob).approve(ExchangeContract.address, ethers.utils.parseEther("2000")))
      .to.emit(Token, "Approval")
      .withArgs(bob.address, ExchangeContract.address, ethers.utils.parseEther("2000"));

    await expect(
      ExchangeContract.connect(bob).addLiquidity(ethers.utils.parseEther("200"), {
        value: ethers.utils.parseEther("2"),
      }),
    )
      .to.emit(ExchangeContract, "LiquidityAdded")
      .withArgs(ethers.utils.parseEther("200"), ethers.utils.parseEther("2"), ethers.utils.parseEther("2"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("3"));
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(ethers.utils.parseEther("300"));
    expect(await ExchangeContract.balanceOf(bob.address)).to.be.equal(ethers.utils.parseEther("2"));
  });

  it("Deploys correctly", async () => {
    expect(await ExchangeContract.token()).to.be.equal(Token.address);
  });

  it("Get eth amount by selling tokens", async () => {
    expect(await ExchangeContract.getEthAmount(ethers.utils.parseEther("100"))).to.be.equal("744360902255639097");
  });

  it("Get eth amount on invalid token amount", async () => {
    await expect(ExchangeContract.getEthAmount(0)).to.be.revertedWith("InvalidTokenAmountSold");
  });

  // Take a closer look here
  it("Get price", async () => {
    let tokenReserve = await ExchangeContract.getTokenSupply();
    let ethReserve = await ethers.provider.getBalance(ExchangeContract.address);

    expect(await ExchangeContract.getPrice(tokenReserve, ethReserve)).to.be.equal(100000); // price of an ether in tokens
    expect(await ExchangeContract.getPrice(ethReserve, tokenReserve)).to.be.equal(10); // price of token in ether
  });

  it("Get price of invalid amounts", async () => {
    let ethReserve = await ethers.provider.getBalance(ExchangeContract.address);

    await expect(ExchangeContract.getPrice(0, ethReserve)).to.be.revertedWith("InvalidReserves"); // price of an ether in tokens
    await expect(ExchangeContract.getPrice(ethReserve, 0)).to.be.revertedWith("InvalidReserves"); // price of token in ether
  });

  it("Token Supply", async () => {
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(ethers.utils.parseEther("300"));
  });

  it("Token Supply", async () => {
    expect(await ExchangeContract.getTokenSupply()).to.be.equal(ethers.utils.parseEther("300"));
  });

  it("Get token amount by selling eth", async () => {
    expect(await ExchangeContract.getTokenAmount(ethers.utils.parseEther("100"))).to.be.equal("291176470588235294117");
  });

  it("Get token amount on invalid eth amount", async () => {
    await expect(ExchangeContract.getTokenAmount(0)).to.be.revertedWith("InvalidTokenAmountSold");
  });

  it("Remove invalid liquidity amount", async () => {
    await expect(ExchangeContract.removeLiquidity(0)).to.be.revertedWith("InvalidAmountToRemove");
  });

  it("Remove liquidity", async () => {
    await expect(ExchangeContract.removeLiquidity(ethers.utils.parseEther("1")))
      .to.emit(ExchangeContract, "Transfer")
      .withArgs(user.address, ethers.constants.AddressZero, ethers.utils.parseEther("1"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("2"));
    expect(await Token.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("100"));
  });

  // TO DO
  it("Remove liquidity after a swap", async () => {
    await expect(ExchangeContract.removeLiquidity(ethers.utils.parseEther("1")))
      .to.emit(ExchangeContract, "Transfer")
      .withArgs(user.address, ethers.constants.AddressZero, ethers.utils.parseEther("1"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal(ethers.utils.parseEther("2"));
    expect(await Token.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("100"));
  });

  it("Swap Token to Eth", async () => {
    await expect(await Token.mint(user.address, ethers.utils.parseEther("1")))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, ethers.utils.parseEther("1"));

    await expect(ExchangeContract.tokenToEthSwap(ethers.utils.parseEther("1"), 10))
      .to.emit(Token, "Transfer")
      .withArgs(user.address, ExchangeContract.address, ethers.utils.parseEther("1"));

    expect(await ethers.provider.getBalance(ExchangeContract.address)).to.be.equal("2990132562543606100");
  });

  it("Swap Token to Eth with 0 tokens", async () => {
    await expect(await Token.mint(user.address, ethers.utils.parseEther("1")))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, ethers.utils.parseEther("1"));

    await expect(ExchangeContract.tokenToEthSwap(0, 10)).to.be.revertedWith("InsufficientTokenSold");
  });

  it("Swap Token to Eth with an ethBought less then minEth", async () => {
    await expect(await Token.mint(user.address, ethers.utils.parseEther("1")))
      .to.emit(Token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, ethers.utils.parseEther("1"));

    await expect(ExchangeContract.tokenToEthSwap(1, 10)).to.be.revertedWith("InsufficientOutputAmount");
  });

  it("Swap Eth to Token", async () => {
    await expect(ExchangeContract.ethToTokenSwap(10, { value: ethers.utils.parseEther("1") }))
      .to.emit(Token, "Transfer")
      .withArgs(ExchangeContract.address, user.address, "59519038076152304609");
  });

  it("Swap Eth to Token with topkenBought less then minToken", async () => {
    await expect(
      ExchangeContract.ethToTokenSwap(ethers.utils.parseEther("1"), { value: ethers.utils.parseEther("0.01") }),
    ).to.be.revertedWith("InsufficientOutputAmount");
  });

  it("Transfer Eth to Token", async () => {
    await expect(ExchangeContract.ethToTokenTransfer(bob.address, 10, { value: ethers.utils.parseEther("1") }))
      .to.emit(Token, "Transfer")
      .withArgs(ExchangeContract.address, bob.address, "59519038076152304609");
  });

  it("Transfer Eth to Token with topkenBought less then minToken", async () => {
    await expect(
      ExchangeContract.ethToTokenTransfer(bob.address, ethers.utils.parseEther("1"), {
        value: ethers.utils.parseEther("0.01"),
      }),
    ).to.be.revertedWith("InsufficientOutputAmount");
  });
});
