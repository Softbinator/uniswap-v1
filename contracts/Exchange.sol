// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice Factory interface
 */
interface IFactory {
    function tokenToExchange(address _tokenAddress) external returns (address);
}

/**
 * @author Softbinator Technologies
 * @notice This Contract is build after Uniswap - V1
 * @dev The contract is ERC20 to implement LP tokens
 */
contract Exchange is ERC20 {
    /// @notice Interface for token
    IERC20 public token;

    /// @notice Factory contract that deploys the Exchange
    IFactory public factory;

    /// @notice Event for adding liquidity
    event LiquidityAdded(uint256 tokenAmount, uint256 ethAmount, uint256 liquidityTokens);

    /// @notice Event for swaping 2 tokens
    event TokenToToken(uint256 amountToken1);

    /// @notice Error triggered when reserves are 0
    error InvalidReserves();

    /// @notice Error triggered when the user request tokens for 0 or less eth
    error InvalidEthAmountSold();

    /// @notice Error triggered when the user request eth for 0 or less tokens
    error InvalidTokenAmountSold();

    /// @notice Error triggered when the output token/eth is less then the minimum amount setted by user
    error InsufficientOutputAmount();

    /// @notice Error triggered when the user sends less tokens then is required by exchenge ratio
    error InsufficientTokenAmount();

    /// @notice Error triggered when the user request 0 LP
    error InvalidAmountToRemove();

    /// @notice Error triggered when the address of token is address 0
    error InvalidTokenAddress();

    /// @notice Error triggered when the address of the exchange is 0 or address(this)
    error InvalidExchangeAddress();

    /// @notice Error triggered when the token sold to eth is less then 0
    error InsufficientTokenSold();

    constructor(IERC20 _token) ERC20("LPUniswapV1", "LPUV1") {
        // bcs _token is of type IERC20, address 0 is reverted in this case??????
        if (_token == IERC20(address(0))) {
            revert InvalidTokenAddress();
        }
        token = _token;
        factory = IFactory(msg.sender);
    }

    /**
     * @notice Add liquidity by paying eth and transfering tokens to the exchange
     * @param _tokenAmount represents the amount of tokens transfered
     * @dev When somebody adds liquidity, they get LP tokens
     * @dev If the exchange has a ration of token/eth then the amount of tokens/eth added should respect it
     */
    function addLiquidity(uint256 _tokenAmount) external payable returns (uint256) {
        if (getTokenSupply() == 0) {
            token.transferFrom(msg.sender, address(this), _tokenAmount);
            uint256 liquidity = address(this).balance;
            emit LiquidityAdded(_tokenAmount, msg.value, liquidity);
            _mint(msg.sender, liquidity);
            return liquidity;
        } else {
            uint256 ethReserve = address(this).balance - msg.value;
            uint256 tokenReserve = getTokenSupply();
            uint256 neccessaryTokenAmount = (tokenReserve * msg.value) / ethReserve;
            if (neccessaryTokenAmount > _tokenAmount) {
                // Question por favor, what if I send 1 eth and 10000000 tokens??
                revert InsufficientTokenAmount();
            }
            token.transferFrom(msg.sender, address(this), _tokenAmount);
            uint256 liquidity = (totalSupply() * msg.value) / ethReserve;
            emit LiquidityAdded(_tokenAmount, msg.value, liquidity);
            _mint(msg.sender, liquidity);
            return liquidity;
        }
    }

    /**
     * @notice Make the swap from eth to token and send eth to msg.sender
     * @param _minTokens the minimum amount of tokens that should get from swap
     */
    function ethToTokenSwap(uint256 _minTokens) external payable {
        ethToToken(msg.sender, _minTokens);
    }

    /**
     * @notice Make the swap from eth to token and send eth to msg.sender
     * @param _minTokens the minimum amount of tokens that should get from swap
     */
    function ethToTokenTransfer(address _to, uint256 _minTokens) external payable {
        ethToToken(_to, _minTokens);
    }

    /**
     * @notice Generic implementation of transfering tokens after eth conversion
     * @param _minTokens the minimum amount of tokens that should get from swap
     */
    function ethToToken(address _to, uint256 _minTokens) private {
        uint256 tokenBought = getAmount(msg.value, address(this).balance - msg.value, getTokenSupply());
        if (tokenBought < _minTokens) {
            revert InsufficientOutputAmount();
        }
        token.transfer(_to, tokenBought);
    }

    /**
     * @notice Make the swap from token to eth
     * @param _tokenSold the amount of tokens to swap
     * @param _minEth the minimum amount of eth that should get from swap
     */
    function tokenToEthSwap(uint256 _tokenSold, uint256 _minEth) external {
        if (_tokenSold <= 0) {
            revert InsufficientTokenSold();
        }
        uint256 ethBought = getAmount(_tokenSold, getTokenSupply(), address(this).balance);
        if (ethBought < _minEth) {
            revert InsufficientOutputAmount();
        }

        token.transferFrom(msg.sender, address(this), _tokenSold);
        payable(msg.sender).transfer(ethBought);
    }

    /**
     * @notice Make the swap from token1 to token2
     * @param _tokenSold the amount of token1 to change
     * @param _minTokenBought the minimum amount of token2 to receive
     * @param _tokenAddress address of token2
     * @dev Token1 is converted in eth, and then eth is converted to token2
     */
    function tokenToTokenSwap(
        uint256 _tokenSold,
        uint256 _minTokenBought,
        address _tokenAddress
    ) external {
        address exchangeAddress = factory.tokenToExchange(_tokenAddress);

        if (exchangeAddress == address(this) || exchangeAddress == address(0)) {
            revert InvalidExchangeAddress();
        }

        uint256 _ethBought = getAmount(_tokenSold, getTokenSupply(), address(this).balance);
        token.transferFrom(msg.sender, address(this), _tokenSold);

        Exchange(exchangeAddress).ethToTokenTransfer{ value: _ethBought }(msg.sender, _minTokenBought);
        emit TokenToToken(_tokenSold);
    }

    /**
     * @notice Cash in an amount of LP from exchange
     * @param _amount the amount of LP
     * @dev LP are burned, and tokens and eth are transfered
     */
    function removeLiquidity(uint256 _amount) public returns (uint256, uint256) {
        if (_amount <= 0) {
            revert InvalidAmountToRemove();
        }
        uint256 ethAmount = (address(this).balance * _amount) / totalSupply();
        uint256 tokenAmount = (getTokenSupply() * _amount) / totalSupply();

        _burn(msg.sender, _amount);
        payable(msg.sender).transfer(ethAmount);
        token.transfer(msg.sender, tokenAmount);

        return (ethAmount, tokenAmount);
    }

    /**
     * @notice Get the output amount of the swap
     * @param _inputAmount the amount of what you want to sell = ∆x
     * @param _inputReserve the total amount of the token own by the exchange that you want to sell = x
     * @param _outputReserve the total amount of the token own by the exchange that you want to buy = y
     * @dev Base Formula without fee : ∆y = ( y * ∆x) / ( x + ∆x ), where ∆y = the amount that you get when swapping
     * @dev Fee: amountWithFee = (∆x - fee) / 100
     * @dev Formula with Fee: ∆y = (y * ∆x * 99) / (x * 100 + ∆x * 99), fee = 1%
     * @dev Where numerator = (y * ∆x * 99)
     * @dev Where denominator = (x * 100 + ∆x * 99)
     */
    function getAmount(
        uint256 _inputAmount,
        uint256 _inputReserve,
        uint256 _outputReserve
    ) private pure returns (uint256) {
        if (_inputReserve <= 0 && _outputReserve <= 0) {
            revert InvalidReserves();
        }

        uint256 inputAmountWithFee = _inputAmount * 99;
        uint256 numerator = inputAmountWithFee * _outputReserve;
        uint256 denominator = (_inputReserve * 100) + inputAmountWithFee;

        return numerator / denominator;
    }

    /**
     * @notice Get the token amount when selling eth
     * @param _ethSold the amount eth sold
     */
    function getTokenAmount(uint256 _ethSold) external view returns (uint256) {
        if (_ethSold <= 0) {
            revert InvalidEthAmountSold();
        }

        return getAmount(_ethSold, address(this).balance, getTokenSupply());
    }

    /**
     * @notice Get the amount of tokens owned by exchange
     */
    function getTokenSupply() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice Returns the price depending of reserves of the exchange
     */
    function getPrice(uint256 _inputReserve, uint256 _outputReserve) public pure returns (uint256) {
        if (_inputReserve <= 0 || _outputReserve <= 0) {
            revert InvalidReserves();
        }
        return (_inputReserve * 1000) / _outputReserve; // why * 1000 ????? cum decidem valoare buna ??
    }

    /**
     * @notice Get the eth amount when selling tokens
     * @param _tokenSold the amount of tokens sold
     */
    function getEthAmount(uint256 _tokenSold) external view returns (uint256) {
        if (_tokenSold <= 0) {
            revert InvalidTokenAmountSold();
        }
        return getAmount(_tokenSold, getTokenSupply(), address(this).balance);
    }
}
