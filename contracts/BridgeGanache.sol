pragma solidity 0.6.4;
pragma experimental ABIEncoderV2;

import "./Bridge.sol";

/**
    @title For testing purposes.
    @author ChainSafe Systems.
 */
contract BridgeGanache is Bridge {
    constructor (uint8 chainID, address[] memory initialRelayers, uint initialRelayerThreshold, uint256 fee, uint256 expiry)
    Bridge(chainID, initialRelayers, initialRelayerThreshold, fee, expiry) public {}

    function validateBlockSignature(
        bytes memory /*message*/,
        bytes memory blockHashBLSHints,
        bytes memory /*blockHashSignature*/,
        bytes memory /*aggregatePublicKey*/
    ) internal override view returns(bool) {
        return blockHashBLSHints.length > 0;
    }
}
