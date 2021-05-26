const { assert } = require("chai");
const { tonelli } = require("./tonelli")
const TestHelperContract = artifacts.require('TestHelper');

let base = 0x1ae3a4617c510eac63b05c06ca1493b1a22d9f300f5138f1ef3622fba094800170b5d44300000008508c00000000001n
let y1 = 0x001cefdc52b4e1eba6d3b6633bf15a765ca326aa36b6c0b5b1db375b6a5124fa540d200dfb56a6e58785e1aaaa63715bn
let y2 = 0x01914a69c5102eff1f674f5d30afeec4bd7fb348ca3e52d96d182ad44fb82305c2fe3d3634a9591afd82de55559c8ea6n
let x = 0x008848defe740a67c8fc6225bf87ff5485951e2caa9d41bb188282c8bd37cb5cd5481512ffcd394eeab9b16eb21be9efn

function max(a,b) {
  if (a < b) return b
  else return a
}

function min(a,b) {
  if (a > b) return b
  else return a
}

function findY(x, greatest) {
  let [a, b] = tonelli((x ** 3n + 1n) % base, base)
  return [max(a,b), min(a,b)]
}

function uncompressSig(comp) {
  let sig = [...comp].reverse()
  let greatest = (sig[0] & 0x80) != 0
  sig[0] = sig[0] & 0x7f
  let x = BigInt("0x"+Buffer.from(sig).toString("hex"))
  let [a, b] = tonelli((x ** 3n + 1n) % base, base)
  let y = greatest ? max(a,b) : min(a,b)
  // console.log(x, a, b, greatest ? max(a,b) : min(a,b), a < b, greatest)
  return `0x${x.toString(16).padStart(128,0)}${y.toString(16).padStart(128,0)}`
}

async function makeHint(instance, blockHash) {
  // let inner_hash = inner
  // let extra_data = extra // counter, max nonsigners, epoch
  let res = await instance.testHash(blockHash)
  // console.log(res);
  console.log("hash result", res)
  let arr = [...Buffer.from(res.substr(2), "hex")]
  // console.log(arr.slice(0, 48))
  let needed = arr.slice(0, 48).reverse()
  // Parse to point
  needed[0] = needed[0] & 0x01
  let x = BigInt("0x" + Buffer.from(needed).toString("hex"))
  let [y1, y2] = findY(x)
  // console.log("x y1 y2", x.toString(16), y1.toString(16), y2.toString(16))
  // let parsed_x = await instance.testParseToRandom(extra_data, inner_hash)
  // console.log('parsed_x', parsed_x)
  let hints = `0x${y1.toString(16).padStart(128, 0)}${y2.toString(16).padStart(128, 0)}`
  console.log('hint', hints)
  // let point = await instance.testParseToG1Scaled(extra_data, inner_hash, hints)
  // console.log('point', point)
  return hints
}

contract("CeloBlockSignatureVerifier", function () {
  let instance;
  
  before(async () => {
    instance = await TestHelperContract.new();
  });

  it('blake2xs hash works', async () => {
    let data = "0x1ae3a4617c510eac63b05c06ca1493b1a22d9f300f5138f1ef3622fba094800170b5d44300000008508c000000000010"
    let res = await instance.testHash(data)
    assert(res == '0x58c64608363b3d7f29e6502799625253ea7ddfafac86701f251215113d5c7c0b8a1907e541658e785a6e892c636193280f703ed74dc10a7d7749385f8be43277')
  });

    // function testBlock(bytes memory blockHash, bytes memory blockHashHints, bytes memory sig, bytes memory agg)
  // possible apk f5114c4fe7cc7b5ae24a46ec95822af0781986f96dc44101f81e282ecbbe2a433178e79a4f5756ce2cbafd27d5d4af0023e41b746acf35439a1110330c21d97845921974f1985ff5191038cf1ddc19efc4da8ab1abd6ff043823de6e9aa46781 
  it.only('block signature verification works', async () => {
    console.log(await instance.testG1(
      '0x9f70fe0d4ba5e8bf507939c00e5b1ce42d0e93edd4e1e82c4c58cee52af3e42802',
      await makeHint(instance, '0x9f70fe0d4ba5e8bf507939c00e5b1ce42d0e93edd4e1e82c4c58cee52af3e42802')));
    console.log(await instance.testG1Scaled(
      '0x9f70fe0d4ba5e8bf507939c00e5b1ce42d0e93edd4e1e82c4c58cee52af3e42802',
      await makeHint(instance, '0x9f70fe0d4ba5e8bf507939c00e5b1ce42d0e93edd4e1e82c4c58cee52af3e42802')));
    let res = await instance.testBlock(
      // '0xe53fa3f23f66592f244d34a87258f208e0f4cfaa700c624c1a75414646729b5d',
      '0x9f70fe0d4ba5e8bf507939c00e5b1ce42d0e93edd4e1e82c4c58cee52af3e42802',
      await makeHint(instance, '0x9f70fe0d4ba5e8bf507939c00e5b1ce42d0e93edd4e1e82c4c58cee52af3e42802'),
      '0x063c39b0d4f7fa61cef3b97fe6705f02ffc209a4f3c91442588f15a884e25e68fb63cc60215ac6912f67b9fee9276501',
      '0xaab506de1ef9b0df75f202b0813904e08d99ba0dbbf2084c3a983d9190c41f5f773489a6ee530da67d517d3151805101860dfdb8d7d72d768643af1b07a468f93ba1e08edb2a7f22c85bad3c2c02545f036647f11ce63eed3bd44e2cc080c480')
    assert(res)
  });
})
