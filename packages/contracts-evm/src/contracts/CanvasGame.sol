// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {EffectstreamL2Contract} from "@effectstream/evm-contracts/src/contracts/EffectstreamL2Contract.sol";

/// @title CanvasGame
/// @notice Minimal EffectstreamL2 subclass. All game logic — paint, fork,
///         seed canvas creation, reward accounting — lives in the
///         Effectstream state machine, which consumes JSON inputs from
///         `effectstreamSubmitGameInput`. Users submit via the batcher
///         (recommended) or directly to the inherited function.
contract CanvasGame is EffectstreamL2Contract {
    constructor(address _owner, uint256 _fee) EffectstreamL2Contract(_owner, _fee) {}
}
