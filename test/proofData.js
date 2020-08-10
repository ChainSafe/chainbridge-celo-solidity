/**
 * Copyright 2020 ChainSafe Systems
 * SPDX-License-Identifier: LGPL-3.0-only
 */
const Ethers = require('ethers');

const rlp = require('rlp');
const { arrayify, hexlify } = Ethers.utils;

const signatureHeader = '0xff5c6287761305d7d8ae76ca96f6cb48e48aa04cf3c9280619c8993f21e335caff5c6287761305d7d8ae76ca96f6cb48e48aa04cf3c9280619c8993f21e335ca';
const aggregatePublicKey = signatureHeader;
const g1 = signatureHeader;
const hashedMessage = signatureHeader;

const value = '*';
const branchRoot = [ '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', value ];
const rootHash = Ethers.utils.keccak256(rlp.encode(branchRoot));
const key = '0x';
const nodes = hexlify(rlp.encode([branchRoot]));

const preimagePart = rootHash.slice(2) + key.slice(2) + nodes.slice(2) +
    aggregatePublicKey.slice(2) + hashedMessage.slice(2) + signatureHeader.slice(2);

module.exports = {
    signatureHeader,
    aggregatePublicKey,
    g1,
    hashedMessage,
    rootHash,
    key,
    nodes,
    preimagePart
};
