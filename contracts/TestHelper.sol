//SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity 0.6.4;

import "./MPTVerifier.sol";
import "./RLPReader/RLPReader.sol";
import "./CeloBlockSignatureVerifier.sol";

contract TestHelper is MPTVerifier {
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    // Used to overcome Solidity compiler's "Stack too deep" error, due to many local vars in executeProposal().
    struct ExecuteProposalMemory {
        uint8 chainID;
        uint64 depositNonce;
        bytes32 resourceID;
        bytes32 blockHash;
        bytes32 transactionsRoot;
        address handler;
        uint72 nonceAndID;
        bytes32 dataHash;
    }

    function testHash(bytes memory message)
    public view returns (bytes memory) {
        return CeloBlockSignatureVerifier.doHash(message);
    }

    function testBlock(bytes memory blockHash, bytes memory blockHashHints, bytes memory sig, bytes memory agg)
    public view returns (bool) {
        return CeloBlockSignatureVerifier.checkBlock(blockHash, blockHashHints, sig, agg);
    }

    function testExecuteProposal(
        uint8        chainID,
        uint64       depositNonce,
        bytes memory /*data*/,
        bytes32      resourceID,
        bytes memory blockHeaderRLP,
        bytes1       blockHashPrefix,
        bytes memory blockHashSuffix,
        bytes memory blockHashBLSHints,
        bytes memory blockHashSignature,
        bytes memory aggregatePublicKey,
        bytes memory transactionMerkleKey,
        bytes memory transactionMerkleNodes
    ) public view {
        ExecuteProposalMemory memory mem = ExecuteProposalMemory(
            chainID, depositNonce, resourceID, keccak256(blockHeaderRLP),
            blockHeaderRLP.toRlpItem().toList()[3].toBytes32(), address(0), 0, bytes32(0)
        );

        bytes memory message = abi.encodePacked(blockHashPrefix, mem.blockHash, blockHashSuffix);
        require(CeloBlockSignatureVerifier.checkBlock(
            message, blockHashBLSHints, blockHashSignature, aggregatePublicKey),
            "Unable to verify signed block header");
        require(MPTVerifier._validateMPTProof(
            mem.transactionsRoot, transactionMerkleKey, transactionMerkleNodes).length > 0,
            "Unable to verify transaction inclusion in the block");
    }
}
