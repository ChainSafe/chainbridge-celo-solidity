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
  // let point = await instance.testParseToG1Scaled(extra_data, inner_hash, hints)
  // console.log('point', point)
  return hints
}

contract.skip("CeloBlockSignatureVerifier", function () {
  let instance;
  
  before(async () => {
    instance = await TestHelperContract.new();
  });

  it('blake2xs hash works', async () => {
    let data = "0x1ae3a4617c510eac63b05c06ca1493b1a22d9f300f5138f1ef3622fba094800170b5d44300000008508c000000000010"
    let res = await instance.testHash(data)
    assert(res == '0x58c64608363b3d7f29e6502799625253ea7ddfafac86701f251215113d5c7c0b8a1907e541658e785a6e892c636193280f703ed74dc10a7d7749385f8be43277')
  });

  it('block signature verification works', async () => {
    let res = await instance.testBlock(
      '0x009f70fe0d4ba5e8bf507939c00e5b1ce42d0e93edd4e1e82c4c58cee52af3e42802',
      await makeHint(instance, '0x009f70fe0d4ba5e8bf507939c00e5b1ce42d0e93edd4e1e82c4c58cee52af3e42802'),
      '0x00000000000000000000000000000000016527e9feb9672f91c65a2160cc63fb685ee284a8158f584214c9f3a409c2ff025f70e67fb9f3ce61faf7d4b0393c060000000000000000000000000000000000a3a8fc6a0258b5bba7bb306d8e7abc147999201f61df1e65f1adbd6ba7b6037e08e966178165ba8f28101a94574853',
      '0x0000000000000000000000000000000001518051317d517da60d53eea68934775f1fc490913d983a4c08f2bb0dba998de0043981b002f275dfb0f91ede06b5aa0000000000000000000000000000000000c480c02c4ed43bed3ee61cf14766035f54022c3cad5bc8227f2adb8ee0a13bf968a4071baf4386762dd7d7b8fd0d8600000000000000000000000000000000002f95dc47ed1188c0cc5762cf3fe3de3cbd0584eedcda9581d78dbc44dbbbc8f773003f3d024c94a04b099158d677bf0000000000000000000000000000000000eca490fa6b49e659f7e143bf06e230b6417cd7caaa65ae2e9b6a610b84559e9244879348c1a9ac06259f6fdba605e5')
    assert(res)
  });
})
