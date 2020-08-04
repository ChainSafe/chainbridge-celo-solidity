/**
 * Copyright 2020 ChainSafe Systems
 * SPDX-License-Identifier: LGPL-3.0-only
 */

const TruffleAssert = require('truffle-assertions');
const Ethers = require('ethers');
const { arrayify, hexlify, toUtf8Bytes } = Ethers.utils;
const rlp = require('rlp');

const MPTVerifierContract = artifacts.require('MPTVerifier');

const textToBytes = (text) => {
    return hexlify(toUtf8Bytes(text));
};

contract('MPTVerifier', async (accounts) => {
    let MPTVerifierInstance;
    
    // MPT
    // rootHash: [ <16>, hashA ]
    // hashA:    [ '', '', '', '', hashB, '', '', '', [ <20 6f 72 73 65>, 'stallion' ], '', '', '', '', '', '', '', '' ]
    // hashB:    [ <00 6f>, hashD ]
    // hashD:    [ '', '', '', '', '', '', [ <17>, [ '', '', '', '', '', '', [ <35>, 'coin' ], '', '', '', '', '', '', '', '', '', 'puppy' ] ], '', '', '', '', '', '', '', '', '', 'verb' ]

    // Keys
    // <64 6f> : 'verb'
    // <64 6f 67> : 'puppy'
    // <64 6f 67 65> : 'coin'
    // <68 6f 72 73 65> : 'stallion'

    const D = [
        '', '', '', '', '', '',
        [ 0x17, [ '', '', '', '', '', '', [ 0x35, 'coin' ], '', '', '', '', '', '', '', '', '', 'puppy' ] ],
        '', '', '', '', '', '', '', '', '', 'verb'
    ];
    const hashD = Ethers.utils.keccak256(rlp.encode(D));
    const B = [ arrayify('0x006f'), arrayify(hashD) ];
    const hashB = Ethers.utils.keccak256(rlp.encode(B));
    const A = [
        '', '', '', '', arrayify(hashB), '', '', '',
        [ arrayify('0x206f727365'), 'stallion' ],
        '', '', '', '', '', '', '', ''
    ];
    const hashA = Ethers.utils.keccak256(rlp.encode(A));
    const root = [ 0x16, arrayify(hashA) ];
    const hashRoot = Ethers.utils.keccak256(rlp.encode(root));

    const emptyLeafKey = '0x0600';

    const verbKey = '0x0604060f';
    const puppyKey = '0x0604060f0607';
    const coinKey = '0x0604060f06070605';
    const stallionKey = '0x0608060f070207030605';

    const verb = textToBytes('verb');
    const puppy = textToBytes('puppy');
    const coin = textToBytes('coin');
    const stallion = textToBytes('stallion');

    before(async () => {
        MPTVerifierInstance = await MPTVerifierContract.new();
    });


    it('[smoke] should verify deep proof with directly referenced nodes', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashRoot, coinKey, mptStack), coin);
    });

    it('[smoke] should verify long key proof', async () => {
        const mptStack = hexlify(rlp.encode([root, A]));
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashRoot, stallionKey, mptStack), stallion);
    });

    it('[smoke] should verify short key proof', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashRoot, verbKey, mptStack), verb);
    });

    it('[smoke] should verify middle key proof', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashRoot, puppyKey, mptStack), puppy);
    });

    it('[smoke] should verify value inclusion', async () => {
        const mptStack = hexlify(rlp.encode([root, A]));
        const valueHash = hexlify(Ethers.utils.keccak256(arrayify(stallion)))
        assert.isTrue(await MPTVerifierInstance.validateMPTValueInclusion(hashRoot, stallionKey, mptStack, valueHash));
    });

    it('[smoke] should verify value exclusion', async () => {
        const mptStack = hexlify(rlp.encode([root, A]));
        const valueHash = hexlify(Ethers.utils.keccak256(arrayify(coin)))
        assert.isFalse(await MPTVerifierInstance.validateMPTValueInclusion(hashRoot, stallionKey, mptStack, valueHash));
    });

    it('should verify inclusion in root-branch node without key', async () => {
        const value = '*'.repeat(31);
        const branchRoot = [ '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', value ];
        const hashBranchRoot = Ethers.utils.keccak256(rlp.encode(branchRoot));
        const mptStack = hexlify(rlp.encode([branchRoot]));
        const key = '0x';
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashBranchRoot, key, mptStack), textToBytes(value));
    });

    it('should verify inclusion in root-branch node with key', async () => {
        const value = '*'.repeat(31);
        const branchRoot = [ '', '', [ 0x30, value ], '', '', '', [ 0x31, 'something' ], '', '', '', '', '', '', '', '', '', '' ];
        const hashBranchRoot = Ethers.utils.keccak256(rlp.encode(branchRoot));
        const mptStack = hexlify(rlp.encode([branchRoot]));
        const key = '0x0200';
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashBranchRoot, key, mptStack), textToBytes(value));
    });

    it('should verify empty root', async () => {
        const emptyRoot = '';
        const hashEmptyRoot = Ethers.utils.keccak256(rlp.encode(emptyRoot));
        const mptStack = hexlify(rlp.encode([]));
        const key = '0x02';
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashEmptyRoot, key, mptStack), null);
    });

    it('should verify inclusion of 1 byte long value', async () => {
        const value = '*';
        const leafRoot = [ 0x31, value ];
        const hashLeafRoot = Ethers.utils.keccak256(rlp.encode(leafRoot));
        const mptStack = hexlify(rlp.encode([leafRoot]));
        const key = '0x01';
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashLeafRoot, key, mptStack), textToBytes(value));
    });

    it('should verify inclusion of 32 bytes long value', async () => {
        const longValue = '*'.repeat(32);
        const leafRoot = [ 0x31, longValue ];
        const hashLeafRoot = Ethers.utils.keccak256(rlp.encode(leafRoot));
        const mptStack = hexlify(rlp.encode([leafRoot]));
        const key = '0x01';
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashLeafRoot, key, mptStack), textToBytes(longValue));
    });

    it('should verify inclusion of very long value', async () => {
        const longValue = '*'.repeat(1000);
        const leafRoot = [ 0x31, longValue ];
        const hashLeafRoot = Ethers.utils.keccak256(rlp.encode(leafRoot));
        const mptStack = hexlify(rlp.encode([leafRoot]));
        const key = '0x01';
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashLeafRoot, key, mptStack), textToBytes(longValue));
    });

    it('should verify exclusion of key, when key is too long', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        const missingKey = coinKey + '01';
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashRoot, missingKey, mptStack), null);
    });

    it('should verify exclusion of key, when key is pointing to empty leaf', async () => {
        const mptStack = hexlify(rlp.encode([root, A]));
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashRoot, emptyLeafKey, mptStack), null);
    });

    it('should revert on leaf node in the middle of proof', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        const missingKey = stallionKey + '01';
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, missingKey, mptStack), 'Leaf in the middle');
    });

    it('should revert on root hash mismatch', async () => {
        const mptStack = hexlify(rlp.encode([root, A]));
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashA, stallionKey, mptStack), 'Root hash mismatch');
    });

    it('should revert on node hash mismatch', async () => {
        const mptStack = hexlify(rlp.encode([root, B]));
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, stallionKey, mptStack), 'Node hash mismatch');
    });

    it('should revert on leaf node in the middle of proof', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        const missingKey = stallionKey + '01';
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, missingKey, mptStack), 'Leaf in the middle');
    });

    it('should revert on key divergance in the middle of proof', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        const missingKey = stallionKey.slice(0, -2);
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, missingKey, mptStack), 'Divergence in the middle');
    });

    it('should revert if key is too short for present nodes list', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        const shortKey = '0x06';
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, shortKey, mptStack), 'Key consumed in the middle');
    });

    it('should revert for invalid first nibble in the extension/leaf node', async () => {
        const invalidRoot = [ 0x46, 'test' ];
        const hashInvalidRoot = Ethers.utils.keccak256(rlp.encode(invalidRoot));
        const mptStack = hexlify(rlp.encode([invalidRoot]));
        const key = '0x06';
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashInvalidRoot, key, mptStack), 'Invalid first nibble');
    });

    it('should revert when the last node is an extension', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B]));
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, coinKey, mptStack), 'Extension in the end');
    });

    it('should revert on invalid nibble in the key', async () => {
        const mptStack = hexlify(rlp.encode([root, A]));
        const invalidKey = '0x0610';
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, invalidKey, mptStack), 'Invalid nibble');
        const invalidKey2 = '0x06ff';
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, invalidKey2, mptStack), 'Invalid nibble');
    });

    it('should revert on empty leaf node in the middle of proof', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B]));
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashRoot, emptyLeafKey, mptStack), 'Empty leaf in the middle');
    });

    it('should revert on invalid node length', async () => {
        const invalidRoot = [ 0x06, 'test', 'extra' ];
        const hashInvalidRoot = Ethers.utils.keccak256(rlp.encode(invalidRoot));
        const mptStack = hexlify(rlp.encode([invalidRoot]));
        const key = '0x06';
        await TruffleAssert.reverts(MPTVerifierInstance.validateMPTProof(hashInvalidRoot, key, mptStack), 'Invalid node length');
    });
});
