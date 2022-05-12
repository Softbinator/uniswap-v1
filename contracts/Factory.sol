// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Exchange.sol";

/**
 * @author Softbinator Technologies
 * @notice This Contract creates and stores multiple exchanges
 * @notice By creating multiple exchanges, an user can swap between more tokens
 */
contract Factory {
    /// @notice Mapping to store existing tokens to exchanges
    mapping(address => address) public tokenToExchange;

    /// @notice Error triggered when trying to create an exchange with address 0 as token
    error InvalidTokenAddress();

    /// @notice Error triggered when trying to create an exchange with existing token address
    error AlreadyExistAnExchangeForThisToken();

    /// @notice Event emited on exchange creation
    event ExchangeCreated(address exchangeAddress);

    /**
     * @notice Creates an exchange from/to token -> eth
     * @param _token represents the address of the token that can by swapped in the created exchange
     * @return exchangeCreated represents the address of the created exchange
     */
    function createExchange(address _token) external returns (address exchangeCreated) {
        if (_token == address(0)) {
            revert InvalidTokenAddress();
        }
        if (tokenToExchange[_token] != address(0)) {
            revert AlreadyExistAnExchangeForThisToken();
        }

        Exchange exchange = new Exchange(IERC20(_token));
        tokenToExchange[_token] = address(exchange);
        emit ExchangeCreated(address(exchange));
        return address(exchange);
    }
}
