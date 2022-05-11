// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @author Softbinator Technologies
 * @notice This Contract is build after Uniswap - V1
 * @dev The contract is ERC20 to implement LP tokens
 */
contract Exchange is ERC20 {
    /// @notice Interface for token
    IERC20 public token;

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

    constructor(
        IERC20 _token,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        // bcs _token is of type IERC20, address 0 is reverted in this case??????
        token = _token;
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
            _mint(msg.sender, liquidity);
            return liquidity;
        } else {
            uint256 ethReserve = address(this).balance - msg.value;
            uint256 tokenReserve = getTokenSupply();
            uint256 neccessaryTokenAmount = (tokenReserve * msg.value) / ethReserve;
            if (neccessaryTokenAmount < _tokenAmount) {
                // Question por favor, what if I send 1 eth and 10000000 tokens??
                revert InsufficientTokenAmount();
            }
            token.transferFrom(msg.sender, address(this), _tokenAmount);
            uint256 liquidity = (totalSupply() * msg.value) / ethReserve;
            _mint(msg.sender, liquidity);
            return liquidity;
        }
    }

    /**
     * @notice Make the swap from eth to token
     * @param _minTokens the minimum amount of tokens that should get from swap
     */
    function ethToTokenSwap(uint256 _minTokens) external payable {
        uint256 tokenBought = getAmount(msg.value, address(this).balance, getTokenSupply());
        if (tokenBought < _minTokens) {
            revert InsufficientOutputAmount();
        }

        token.transfer(msg.sender, tokenBought);
    }

    /**
     * @notice Make the swap from token to eth
     * @param _tokenSold the amount of tokens to swap
     * @param _minEth the minimum amount of eth that should get from swap
     */
    function tokenToEthSwap(uint256 _tokenSold, uint256 _minEth) external {
        uint256 ethBought = getAmount(_tokenSold, getTokenSupply(), address(this).balance);
        if (ethBought < _minEth) {
            revert InsufficientOutputAmount();
        }

        token.transferFrom(msg.sender, address(this), _tokenSold);
        payable(msg.sender).transfer(ethBought);
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
     * @dev Formula with Fee: ∆y = (y * ∆x * 99) / (x * 100 + ∆x * 99)
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
        if (_inputReserve <= 0 && _outputReserve <= 0) {
            revert InvalidReserves();
        }
        return (_inputReserve * 100) / _outputReserve; // why * 100 ?????
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
