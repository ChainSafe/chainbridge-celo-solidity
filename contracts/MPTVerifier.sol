pragma solidity 0.6.4;

import "./RLPReader/RLPReader.sol";

/**
    Based on ProvethVerifier work of:
  
    MIT License

    Copyright (c) 2018:
    - Lorenz Breidenbach
    - Tyler Kell
    - Alex Manuskin
    - Casey Detrio
    - Derek Chin
    - Shayan Eskandari
    - Stephane Gosselin
    - Yael Doweck

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
 */

/**
    @title Allows to validate Merkle-Patricia Trie proofs.
    @author ChainSafe Systems.
    @notice Changes from the original contract allow to process directly
            referenced nodes without excessivly including them in the input.
 */
contract MPTVerifier {
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    function isEmptyBytesequence(RLPReader.RLPItem memory item) internal pure returns (bool) {
        if (item.len != 1) {
            return false;
        }
        uint8 b;
        uint memPtr = item.memPtr;
        assembly {
            b := byte(0, mload(memPtr))
        }
        return b == 0x80 /* empty byte string */;
    }

    function decodeNibbles(bytes memory compact, uint skipNibbles) internal pure returns (bytes memory nibbles) {
        require(compact.length > 0);

        uint length = compact.length * 2;
        require(skipNibbles <= length);
        length -= skipNibbles;

        nibbles = new bytes(length);
        uint nibblesLength = 0;

        for (uint i = skipNibbles; i < skipNibbles + length; i += 1) {
            if (i % 2 == 0) {
                nibbles[nibblesLength] = bytes1((uint8(compact[i/2]) >> 4) & 0xF);
            } else {
                nibbles[nibblesLength] = bytes1((uint8(compact[i/2]) >> 0) & 0xF);
            }
            nibblesLength += 1;
        }

        assert(nibblesLength == nibbles.length);
    }

    function merklePatriciaCompactDecode(bytes memory compact) internal pure returns (bool isLeaf, bytes memory nibbles) {
        require(compact.length > 0);
        uint first_nibble = uint8(compact[0]) >> 4 & 0xF;
        uint skipNibbles;
        if (first_nibble == 0) {
            skipNibbles = 2;
            isLeaf = false;
        } else if (first_nibble == 1) {
            skipNibbles = 1;
            isLeaf = false;
        } else if (first_nibble == 2) {
            skipNibbles = 2;
            isLeaf = true;
        } else if (first_nibble == 3) {
            skipNibbles = 1;
            isLeaf = true;
        } else {
            // Not supposed to happen!
            revert("Invalid first nibble");
        }
        return (isLeaf, decodeNibbles(compact, skipNibbles));
    }

    function sharedPrefixLength(uint xsOffset, bytes memory xs, bytes memory ys) internal pure returns (uint) {
        uint i;
        for (i = 0; i + xsOffset < xs.length && i < ys.length; i++) {
            if (xs[i + xsOffset] != ys[i]) {
                return i;
            }
        }
        return i;
    }

    /**
        @dev Computes the hash of the Merkle-Patricia-Trie hash of the input.
             Merkle-Patricia-Tries use a weird "hash function" that outputs
             *variable-length* hashes: If the input is shorter than 32 bytes,
             the MPT hash is the input. Otherwise, the MPT hash is the
             Keccak-256 hash of the input.
             The easiest way to compare variable-length byte sequences is
             to compare their Keccak-256 hashes.
        @param input The byte sequence to be hashed.
        @return Keccak-256(MPT-hash(input))
     */
    function mptHashHash(bytes memory input) internal pure returns (bytes32) {
        if (input.length < 32) {
            return keccak256(input);
        } else {
            return keccak256(abi.encodePacked(keccak256(abi.encodePacked(input))));
        }
    }

    /**
        @dev Validates a Merkle-Patricia-Trie proof.
             If the proof proves the inclusion of some key-value pair in the
             trie, the value is returned. Otherwise, i.e. if the proof proves
             the exclusion of a key from the trie, an empty byte array is
             returned.
        @param rootHash is the Keccak-256 hash of the root node of the MPT.
        @param mptKey is the key (consisting of nibbles) of the node whose
               inclusion/exclusion we are proving.
        @param stack is the stack of MPT nodes (starting with the root) that
               need to be traversed during verification.
        @return value whose inclusion is proved or an empty byte array for
                a proof of exclusion
     */
    function validateMPTProof(
        bytes32 rootHash,
        bytes memory mptKey,
        RLPReader.RLPItem[] memory stack
    ) internal pure returns (bytes memory value) {
        uint mptKeyOffset = 0;
        uint directReferenceIndex = 16;

        bytes32 nodeHashHash;
        bytes memory rlpNode;
        RLPReader.RLPItem[] memory node;

        RLPReader.RLPItem memory rlpValue;

        if (stack.length == 0) {
            // Root hash of empty Merkle-Patricia-Trie
            require(rootHash == 0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421);
            return new bytes(0);
        }

        // Traverse stack of nodes starting at root.
        for (uint i = 0; i < stack.length; i++) {

            if (directReferenceIndex != 16) {
                // We reached the last node in the stack, and all subsequent
                // nodes are recursively referenced inside it.
                node = node[directReferenceIndex].toList();
            } else {
                // We use the fact that an rlp encoded list consists of some
                // encoding of its length plus the concatenation of its
                // *rlp-encoded* items.
                rlpNode = stack[i].toRlpBytes();
                // The root node is hashed with Keccak-256 ...
                if (i == 0 && rootHash != keccak256(rlpNode)) {
                    revert("Root hash mismatch");
                }
                // ... whereas all other nodes are hashed with the MPT
                // hash function.
                if (i != 0 && nodeHashHash != mptHashHash(rlpNode)) {
                    revert("Node hash mismatch");
                }
                // We verified that stack[i] has the correct hash, so we
                // may safely decode it.
                node = stack[i].toList();
            }
            

            if (node.length == 2) {
                // Extension or Leaf node

                bool isLeaf;
                bytes memory nodeKey;
                (isLeaf, nodeKey) = merklePatriciaCompactDecode(node[0].toBytes());

                uint prefixLength = sharedPrefixLength(mptKeyOffset, mptKey, nodeKey);
                mptKeyOffset += prefixLength;

                if (prefixLength < nodeKey.length) {
                    /**
                        Proof claims divergent extension or leaf. (Only
                        relevant for proofs of exclusion.)
                        An Extension/Leaf node is divergent iff it "skips" over
                        the point at which a Branch node should have been had the
                        excluded key been included in the trie.
                        Example: Imagine a proof of exclusion for path [1, 4],
                        where the current node is a Leaf node with
                        path [1, 3, 3, 7]. For [1, 4] to be included, there
                        should have been a Branch node at [1] with a child
                        at 3 and a child at 4.
                     */

                    // Sanity check
                    if (i < stack.length - 1) {
                        // divergent node must come last in proof
                        revert("Divergence in the middle");
                    }

                    return new bytes(0);
                }

                if (isLeaf) {
                    // Sanity check
                    if (i < stack.length - 1) {
                        // leaf node must come last in proof
                        revert("Leaf in the middle");
                    }

                    if (mptKeyOffset < mptKey.length) {
                        return new bytes(0);
                    }

                    rlpValue = node[1];
                    return rlpValue.toBytes();
                } else { // extension
                    // Sanity check
                    if (directReferenceIndex == 16 && i == stack.length - 1) {
                        // shouldn't be at last level
                        revert("Extension in the end");
                    }

                    if (!node[1].isList()) {
                        // rlp(child) was at least 32 bytes. node[1] contains
                        // Keccak256(rlp(child)).
                        nodeHashHash = keccak256(node[1].toBytes());
                    } else {
                        // rlp(child) was at less than 32 bytes. node[1] contains
                        // rlp(child).
                        nodeHashHash = keccak256(node[1].toRlpBytes());
                        directReferenceIndex = 1;
                        i--;
                    }
                }
            } else if (node.length == 17) {
                // Branch node

                if (mptKeyOffset != mptKey.length) {
                    // we haven't consumed the entire path, so we need to look at a child
                    uint8 nibble = uint8(mptKey[mptKeyOffset]);
                    mptKeyOffset += 1;
                    if (nibble >= 16) {
                        // each element of the path has to be a nibble
                        revert("Invalid nibble");
                    }

                    if (isEmptyBytesequence(node[nibble])) {
                        // Sanity
                        if (i != stack.length - 1) {
                            // leaf node should be at last level
                            revert("Empty leaf in the middle");
                        }

                        return new bytes(0);
                    } else if (!node[nibble].isList()) {
                        nodeHashHash = keccak256(node[nibble].toBytes());
                    } else {
                        nodeHashHash = keccak256(node[nibble].toRlpBytes());
                        directReferenceIndex = nibble;
                        i--;
                    }
                } else {
                    // we have consumed the entire mptKey, so we need to look at what's contained in this node.

                    // Sanity
                    if (i != stack.length - 1) {
                        // should be at last level
                        revert("Key consumed in the middle");
                    }

                    return node[16].toBytes();
                }
            } else {
                // should never happen
                 revert("Invalid node length");
            }
        }
    }
    
    /**
        @dev Validates a Merkle-Patricia-Trie proof.
             If the proof proves the inclusion of some key-value pair in the
             trie, the value is returned. Otherwise, i.e. if the proof proves
             the exclusion of a key from the trie, an empty byte array is
             returned.
        @param rootHash is the Keccak-256 hash of the root node of the MPT.
        @param mptPath is the key (consisting of nibbles) of the node whose
               inclusion/exclusion we are proving. Single nibble per byte.
        @param rlpStack is the RLP encoded list of MPT nodes (starting with
               the root) that need to be traversed during verification.
               If some node in the path is directly referenced in another
               node, it should NOT be additionally added to the list.
        @return value whose inclusion is proved or an empty byte array for
                a proof of exclusion.
     */
    function validateMPTProof(
        bytes32 rootHash,
        bytes calldata mptPath,
        bytes calldata rlpStack
    ) external pure returns (
        bytes memory value
    ) {
        return validateMPTProof(
            rootHash,
            mptPath,
            RLPReader.toList(RLPReader.toRlpItem(rlpStack)));
    }

    /**
        @dev Validates a Merkle-Patricia-Trie value inclusion.
        @param rootHash is the Keccak-256 hash of the root node of the MPT.
        @param mptPath is the key (consisting of nibbles) of the node whose
               inclusion/exclusion we are proving. Single nibble per byte.
        @param rlpStack is the RLP encoded list of MPT nodes (starting with
               the root) that need to be traversed during verification.
               If some node in the path is directly referenced in another
               node, it should NOT be additionally added to the list.
        @param valueHash is the Keccak-256 hash of the value which inclusion
               is validated.
        @return isIncluded true if the provided valueHash equals to the included
                value hash, false otherwise.
     */
    function validateMPTValueInclusion(
        bytes32 rootHash,
        bytes calldata mptPath,
        bytes calldata rlpStack,
        bytes32 valueHash
    ) external pure returns (
        bool isIncluded
    ) {
        bytes memory includedValue = validateMPTProof(
            rootHash,
            mptPath,
            RLPReader.toList(RLPReader.toRlpItem(rlpStack)));
        return valueHash == keccak256(includedValue);
    }
}
