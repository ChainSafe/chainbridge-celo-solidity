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

    it('[smoke] should verify exclusion of key', async () => {
        const mptStack = hexlify(rlp.encode([root, A, B, D]));
        const missingKey = puppyKey + '01';
        assert.equal(await MPTVerifierInstance.validateMPTProof(hashRoot, missingKey, mptStack), null);
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

    // TODO: edge cases tests.
});
