// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Exchange.sol";

contract Factory {
    mapping(address => address) public tokenToExchange;

    error InvalidTokenAddress();

    error AlreadyExistAnExchangeForThisToken();

    function createExchange(address _token) external returns (address) {
        if (_token == address(0)) {
            revert InvalidTokenAddress();
        }
        if (tokenToExchange[_token] != address(0)) {
            revert AlreadyExistAnExchangeForThisToken();
        }

        Exchange exchange = new Exchange(IERC20(_token));
        tokenToExchange[_token] = address(exchange);

        return address(exchange);
    }
}
