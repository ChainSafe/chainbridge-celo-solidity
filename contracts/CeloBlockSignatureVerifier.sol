//SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity 0.6.4;

import {TypedMemView} from "@summa-tx/memview.sol/contracts/TypedMemView.sol";

import {CIP20Lib} from "./CIP20Lib.sol";
import {B12_377Lib} from "./B12.sol";
import {B12} from "./B12.sol";

contract CeloBlockSignatureVerifier {

    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    function negativeP2() internal pure returns (B12.G2Point memory) {
        B12.Fp2 memory x = B12.Fp2(
            B12.Fp(0x018480be71c785fec89630a2a3841d01, 0xc565f071203e50317ea501f557db6b9b71889f52bb53540274e3e48f7c005196),
            B12.Fp(0x00ea6040e700403170dc5a51b1b140d5, 0x532777ee6651cecbe7223ece0799c9de5cf89984bff76fe6b26bfefa6ea16afe)
        );
        B12.Fp2 memory y = B12.Fp2(
            B12.Fp(0x01452cdfba80a16eecda9254a0ee5986, 0x3c1eec808c4079363a9a9facc1d675fb243bd4bbc27383d19474b6bbf602b222),
            B12.Fp(0x00b623a64541bbd227e6681d5786d890, 0xb833c846c39bf79dfa8fb214eb26433dd491a504d1add8f4ab66f22e7a14706e)
        );
        return B12.G2Point(x, y);
    }

    // function doHash(bytes memory data) internal view returns (bytes memory) {
    //     bytes32 config1 = CIP20Lib.createConfig(32 /* digest size */, 0, 0, 0, 32 /* leaf length */, 0 /* node offset */, 64 /* xof digest length*/, 0, 32 /* inner length */, bytes8(0), "ULforxof");
    //     bytes32 config2 = CIP20Lib.createConfig(32 /* digest size */, 0, 0, 0, 32 /* leaf length */, 1, 64 /* xof digest length*/, 0, 32 /* inner length */, bytes8(0), "ULforxof");
    //     return abi.encodePacked(CIP20Lib.blake2sWithConfig(config1, "", data), CIP20Lib.blake2sWithConfig(config2, "", data));
    // }

    function doHash(bytes memory data) internal view returns (bytes memory) {
        bytes32 config1 = CIP20Lib.createConfig(32 /* digest size */, 0, 0, 0, 32 /* leaf length */, 0 /* node offset */, 64 /* xof digest length*/, 0, 32 /* inner length */, bytes8(0), "ULforxof");
        bytes32 config2 = CIP20Lib.createConfig(32 /* digest size */, 0, 0, 0, 32 /* leaf length */, 1, 64 /* xof digest length*/, 0, 32 /* inner length */, bytes8(0), "ULforxof");
        bytes32 config3 = CIP20Lib.createConfig(32 /* digest size */, 0, 1, 1, 0 /* leaf length */, 0, 64 /* xof digest length*/, 0, 0 /* inner length */, bytes8(0), "ULforxof");
        bytes memory hashedData = CIP20Lib.blake2sWithConfig(config3, "", data);
        return abi.encodePacked(CIP20Lib.blake2sWithConfig(config1, "", hashedData), CIP20Lib.blake2sWithConfig(config2, "", hashedData));
    }

    function mapToG1(B12.Fp memory x, B12.Fp memory hint1, B12.Fp memory hint2, bool greatest)
        internal
        view
        returns (B12.G1Point memory) {
        B12.G1Point memory p = B12.mapToG1(x, hint1, hint2, greatest);
        // TODO: check that q != 0
        return p;
    }

    function mapToG1Scaled(B12.Fp memory x, B12.Fp memory hint1, B12.Fp memory hint2, bool greatest)
        internal
        view
        returns (B12.G1Point memory) {
        B12.G1Point memory p = B12.mapToG1(x, hint1, hint2, greatest);
        B12.G1Point memory q = B12_377Lib.g1Mul(p, 30631250834960419227450344600217059328);
        // TODO: check that q != 0
        return q;
    }

    function parseToG1(bytes memory h, bytes memory hints) internal view returns (B12.G1Point memory) {
        bool greatest;
        B12.Fp memory x;
        (x, greatest) = B12.parseRandomPoint(h);
        return mapToG1(x, B12.parseFp(hints, 0), B12.parseFp(hints, 64), greatest);
    }

    function parseToG1Scaled(bytes memory h, bytes memory hints) internal view returns (B12.G1Point memory) {
        bool greatest;
        B12.Fp memory x;
        (x, greatest) = B12.parseRandomPoint(h);
        return mapToG1Scaled(x, B12.parseFp(hints, 0), B12.parseFp(hints, 64), greatest);
    }

    function parseG1(bytes memory blockHash, bytes memory blockHashHints) internal view returns(bytes memory) {
        return B12.serializeG1(parseToG1(doHash(blockHash), blockHashHints));
    }

    function parseG1Scaled(bytes memory blockHash, bytes memory blockHashHints) internal view returns(bytes memory) {
        return B12.serializeG1(parseToG1Scaled(doHash(blockHash), blockHashHints));
    }

    function checkBlock(bytes memory blockHash, bytes memory blockHashHints, bytes memory sig, bytes memory agg) internal view returns (bool) {
        B12.G1Point memory blockPoint = parseToG1Scaled(doHash(blockHash), blockHashHints);
        return false;
        // B12.G2Point memory apk = B12.readG2(agg, 0);
        // B12.G1Point memory sigPoint = B12.parseG1(sig, 0);
        // B12.PairingArg[] memory args = new B12.PairingArg[](2);
        // args[0] = B12.PairingArg(sigPoint, negativeP2());
        // args[1] = B12.PairingArg(blockPoint, apk);
        // return false;
        // return B12_377Lib.pairing(args);
    }
}
