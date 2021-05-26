//SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity 0.6.4;

import "./CeloBlockSignatureVerifier.sol";

contract TestHelper is CeloBlockSignatureVerifier {
    function testHash(bytes memory data) public view returns (bytes memory) {
        return doHash(data);
    }

    function testG1Scaled(bytes memory blockHash, bytes memory blockHashHints)
    public view returns (bytes memory) {
        return parseG1Scaled(blockHash, blockHashHints);
    }

    function testG1(bytes memory blockHash, bytes memory blockHashHints)
    public view returns (bytes memory) {
        return parseG1(blockHash, blockHashHints);
    }

    function testBlock(bytes memory blockHash, bytes memory blockHashHints, bytes memory sig, bytes memory agg)
    public view returns (bool) {
        return checkBlock(blockHash, blockHashHints, sig, agg);
    }
}
