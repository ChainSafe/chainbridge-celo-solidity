/**
 * Copyright 2020 ChainSafe Systems
 * SPDX-License-Identifier: LGPL-3.0-only
 */
const Ethers = require('ethers');

const Helpers = require('@ChainSafe/chainbridge-solidity/test/helpers');

const BridgeContract = artifacts.require("Bridge");
const ERC20HandlerContract = artifacts.require("ERC20Handler");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");
const ERC721HandlerContract = artifacts.require("ERC721Handler");
const ERC721MintableContract = artifacts.require("ERC721MinterBurnerPauser");
const GenericHandlerContract = artifacts.require("GenericHandler");
const CentrifugeAssetContract = artifacts.require("CentrifugeAsset");
const NoArgumentContract = artifacts.require("NoArgument");
const OneArgumentContract = artifacts.require("OneArgument");
const TwoArgumentsContract = artifacts.require("TwoArguments");
const ThreeArgumentsContract = artifacts.require("ThreeArguments");
const { signatureHeader, aggregatePublicKey, hashedMessage,
    rootHash, key, nodes, preimagePart } = require("./proofData");

contract('Gas Benchmark - [Execute Proposal]', async (accounts) => {
    const chainID = 1;
    const relayerThreshold = 1;
    const relayerAddress = accounts[0];
    const depositerAddress = accounts[1];
    const recipientAddress = accounts[2];
    const lenRecipientAddress = 20;
    const gasBenchmarks = [];

    const initialRelayers = [relayerAddress];
    const erc20TokenAmount = 100;
    const erc721TokenID = 1;

    let BridgeInstance;
    let ERC20MintableInstance;
    let ERC20HandlerInstance;
    let ERC721MintableInstance;
    let ERC721HandlerInstance;
    let CentrifugeAssetInstance;
    let NoArgumentInstance;
    let OneArgumentInstance;
    let TwoArgumentsInstance;
    let ThreeArgumentsInstance;

    let erc20ResourceID;
    let erc721ResourceID;
    let centrifugeAssetResourceID;
    let noArgumentResourceID;
    let oneArgumentResourceID;
    let twoArgumentsResourceID;
    let threeArgumentsResourceID;

    const deposit = (resourceID, depositData) => BridgeInstance.deposit(chainID, resourceID, depositData, { from: depositerAddress });
    const vote = (resourceID, depositNonce, depositDataHash) => BridgeInstance.voteProposal(chainID, depositNonce, resourceID, depositDataHash, { from: relayerAddress });
    const execute = (depositNonce, depositData, resourceID) => BridgeInstance.executeProposal(chainID, depositNonce, depositData, resourceID, signatureHeader, aggregatePublicKey, hashedMessage, rootHash, key, nodes);

    before(async () => {
        await Promise.all([
            BridgeContract.new(chainID, initialRelayers, relayerThreshold, 0, 100).then(instance => BridgeInstance = instance),
            ERC20MintableContract.new("token", "TOK").then(instance => ERC20MintableInstance = instance),
            ERC721MintableContract.new("token", "TOK", "").then(instance => ERC721MintableInstance = instance),
            CentrifugeAssetContract.new().then(instance => CentrifugeAssetInstance = instance),
            NoArgumentContract.new().then(instance => NoArgumentInstance = instance),
            OneArgumentContract.new().then(instance => OneArgumentInstance = instance),
            TwoArgumentsContract.new().then(instance => TwoArgumentsInstance = instance),
            ThreeArgumentsContract.new().then(instance => ThreeArgumentsInstance = instance)
        ]);

        erc20ResourceID = Helpers.createResourceID(ERC20MintableInstance.address, chainID);
        erc721ResourceID = Helpers.createResourceID(ERC721MintableInstance.address, chainID);
        centrifugeAssetResourceID = Helpers.createResourceID(CentrifugeAssetInstance.address, chainID);
        noArgumentResourceID = Helpers.createResourceID(NoArgumentInstance.address, chainID);
        oneArgumentResourceID = Helpers.createResourceID(OneArgumentInstance.address, chainID);
        twoArgumentsResourceID = Helpers.createResourceID(TwoArgumentsInstance.address, chainID);
        threeArgumentsResourceID = Helpers.createResourceID(ThreeArgumentsInstance.address, chainID);

        const erc20InitialResourceIDs = [erc20ResourceID];
        const erc20InitialContractAddresses = [ERC20MintableInstance.address];
        const erc20BurnableContractAddresses = [];

        const erc721InitialResourceIDs = [erc721ResourceID];
        const erc721InitialContractAddresses = [ERC721MintableInstance.address];
        const erc721BurnableContractAddresses = [];

        const genericInitialResourceIDs = [
            centrifugeAssetResourceID,
            noArgumentResourceID,
            oneArgumentResourceID,
            twoArgumentsResourceID,
            threeArgumentsResourceID];
        const genericInitialContractAddresses = initialContractAddresses = [
            CentrifugeAssetInstance.address,
            NoArgumentInstance.address,
            OneArgumentInstance.address,
            TwoArgumentsInstance.address,
            ThreeArgumentsInstance.address];
        const genericInitialDepositFunctionSignatures = [
            Helpers.blankFunctionSig,
            Helpers.getFunctionSignature(NoArgumentInstance, 'noArgument'),
            Helpers.getFunctionSignature(OneArgumentInstance, 'oneArgument'),
            Helpers.getFunctionSignature(TwoArgumentsInstance, 'twoArguments'),
            Helpers.getFunctionSignature(ThreeArgumentsInstance, 'threeArguments')];
        const genericInitialExecuteFunctionSignatures = [
            Helpers.getFunctionSignature(CentrifugeAssetInstance, 'store'),
            Helpers.blankFunctionSig,
            Helpers.blankFunctionSig,
            Helpers.blankFunctionSig,
            Helpers.blankFunctionSig];

        await Promise.all([
            ERC20HandlerContract.new(BridgeInstance.address, erc20InitialResourceIDs, erc20InitialContractAddresses, erc20BurnableContractAddresses).then(instance => ERC20HandlerInstance = instance),
            ERC20MintableInstance.mint(depositerAddress, erc20TokenAmount),
            ERC721HandlerContract.new(BridgeInstance.address, erc721InitialResourceIDs, erc721InitialContractAddresses, erc721BurnableContractAddresses).then(instance => ERC721HandlerInstance = instance),
            ERC721MintableInstance.mint(depositerAddress, erc721TokenID, ""),
            GenericHandlerInstance = await GenericHandlerContract.new(BridgeInstance.address, genericInitialResourceIDs, genericInitialContractAddresses, genericInitialDepositFunctionSignatures, genericInitialExecuteFunctionSignatures)
        ]);

        await Promise.all([
            ERC20MintableInstance.approve(ERC20HandlerInstance.address, erc20TokenAmount, { from: depositerAddress }),
            ERC721MintableInstance.approve(ERC721HandlerInstance.address, erc721TokenID, { from: depositerAddress }),
            BridgeInstance.adminSetResource(ERC20HandlerInstance.address, erc20ResourceID, ERC20MintableInstance.address),
            BridgeInstance.adminSetResource(ERC721HandlerInstance.address, erc721ResourceID, ERC721MintableInstance.address),
            BridgeInstance.adminSetGenericResource(GenericHandlerInstance.address, centrifugeAssetResourceID, genericInitialContractAddresses[0], genericInitialDepositFunctionSignatures[0], genericInitialExecuteFunctionSignatures[0]),
            BridgeInstance.adminSetGenericResource(GenericHandlerInstance.address, noArgumentResourceID, genericInitialContractAddresses[1], genericInitialDepositFunctionSignatures[1], genericInitialExecuteFunctionSignatures[1]),
            BridgeInstance.adminSetGenericResource(GenericHandlerInstance.address, oneArgumentResourceID, genericInitialContractAddresses[2], genericInitialDepositFunctionSignatures[2], genericInitialExecuteFunctionSignatures[2]),
            BridgeInstance.adminSetGenericResource(GenericHandlerInstance.address, twoArgumentsResourceID, genericInitialContractAddresses[3], genericInitialDepositFunctionSignatures[3], genericInitialExecuteFunctionSignatures[3]),
            BridgeInstance.adminSetGenericResource(GenericHandlerInstance.address, threeArgumentsResourceID, genericInitialContractAddresses[4], genericInitialDepositFunctionSignatures[4], genericInitialExecuteFunctionSignatures[4])
        ]);
    });

    it('Should execute ERC20 deposit proposal', async () => {
        const depositNonce = 1;
        const depositData = Helpers.createERCDepositData(
            erc20TokenAmount,
            lenRecipientAddress,
            recipientAddress);
        const depositDataHash = Ethers.utils.keccak256(ERC20HandlerInstance.address + depositData.substr(2) + preimagePart);

        await deposit(erc20ResourceID, depositData);
        await vote(erc20ResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData, erc20ResourceID);

        gasBenchmarks.push({
            type: 'ERC20',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should execute ERC721 deposit proposal', async () => {
        const depositNonce = 2;
        const lenMetaData = 0;
        const metaData = 0;
        const depositData = Helpers.createERC721DepositProposalData(
            erc721TokenID,
            lenRecipientAddress,
            recipientAddress,
            lenMetaData,
            metaData);
        const depositDataHash = Ethers.utils.keccak256(ERC721HandlerInstance.address + depositData.substr(2) + preimagePart);

        await deposit(erc721ResourceID, depositData);
        await vote(erc721ResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData, erc721ResourceID);

        gasBenchmarks.push({
            type: 'ERC721',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should execute Generic deposit proposal - Centrifuge asset', async () => {
        const depositNonce = 3;
        const hashOfCentrifugeAsset = Ethers.utils.keccak256('0xc0ffee');
        const depositData = Helpers.createGenericDepositData(hashOfCentrifugeAsset);
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2) + preimagePart);

        await deposit(centrifugeAssetResourceID, depositData);
        await vote(centrifugeAssetResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData, centrifugeAssetResourceID);

        gasBenchmarks.push({
            type: 'Generic - Centrifuge Asset',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should execute Generic deposit proposal - No Argument', async () => {
        const depositNonce = 4;
        const depositData = Helpers.createGenericDepositData(null);

        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2) + preimagePart);

        await deposit(noArgumentResourceID, depositData);
        await vote(noArgumentResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData, noArgumentResourceID);

        gasBenchmarks.push({
            type: 'Generic - No Argument',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should make Generic deposit - One Argument', async () => {
        const depositNonce = 5;
        const depositData = Helpers.createGenericDepositData(Helpers.toHex(42, 32));
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2) + preimagePart);

        await deposit(oneArgumentResourceID, depositData);
        await vote(oneArgumentResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData, oneArgumentResourceID);

        gasBenchmarks.push({
            type: 'Generic - One Argument',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should make Generic deposit - Two Arguments', async () => {
        const depositNonce = 6;
        const argumentOne = [NoArgumentInstance.address, OneArgumentInstance.address, TwoArgumentsInstance.address];
        const argumentTwo = Helpers.getFunctionSignature(CentrifugeAssetInstance, 'store');
        const encodedMetaData = Helpers.abiEncode(['address[]','bytes4'], [argumentOne, argumentTwo]);
        const depositData = Helpers.createGenericDepositData(encodedMetaData);
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2) + preimagePart);

        await deposit(twoArgumentsResourceID, depositData);
        await vote(twoArgumentsResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData, twoArgumentsResourceID);

        gasBenchmarks.push({
            type: 'Generic - Two Argument',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should make Generic deposit - Three Arguments', async () => {
        const depositNonce = 7;
        const argumentOne = 'soylentGreenIsPeople';
        const argumentTwo = -42;
        const argumentThree = true;
        const encodedMetaData = Helpers.abiEncode(['string','int8','bool'], [argumentOne, argumentTwo, argumentThree]);
        const depositData = Helpers.createGenericDepositData(encodedMetaData);
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2) + preimagePart);

        await deposit(threeArgumentsResourceID, depositData);
        await vote(threeArgumentsResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData, threeArgumentsResourceID);

        gasBenchmarks.push({
            type: 'Generic - Three Argument',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should execute proposal with 242 elements in the MPT', async () => {
        // key for transactionIndex 241 = rlp(241) = 0x81f1
        const localKey = '0x08010f01';
        // Constructed from Ethereum mainnet block #10638830 transactions trie.
        const localNodes = '0xf90361f90131a0dfc65e5fd2362a0bd7867426af86ed9bb68ffae3566e9b2522bc8a1c5ffbb33ca0e21364cea67eda80061eb702b260b191a3ca84afd79157f17d6d16de2ab030c0a08232a5127a1e07e3985e9f88f6b57d5ef9c7820ab7bde47e48f28fbaed39d595a0eb8f1b244428673fa4d7062f4a34b5500515e0fd636cccde823fbae595d3b45ea0fd510599d6a6ff4d2ea31cd50e70569c0e586cdd8e4b127857b36f5a1da60adea094ef45e4a1ed66dde46fc4bdbcf3b1296b795bf5910473e1a231182d9d578134a0da109ebe11adf61f933de887edcc2af85d6d0d27e9c8f09033e5d58881faadfba00f3df9dbc65f9e552a33bd5f761c02e128ec8fcc40cd1cac3a7838698084e22fa0cd3a854c7777019132e794a25d47b61a358ffe6e1d28c4365a02d7ec16a0ff258080808080808080f851a00166e55f13fac29ec1b03dec91f2392e4deb8c87553796a1c3a54a29bdfdc645a06e281af7c00ce655b6d9fa1d05ec51b6698ba11132c4777eaab5c7045ec949d7808080808080808080808080808080f901118080808080808080a02391bfd9fa0a14e29e90204a01ab2ac226c154927107704b495c79105dd80d73a0109e961803bf1175e9c30efd99db8fb3fc86ea91958821bca379384ebf2cd935a029770baf197b9458145672540191af93d53bb5a59f41517a4c031a199095d44da0690434fce11ed1666d0edad59d2c0e1f655e4eb0c34407c59d05cea08df658daa07278fdfd5a4fc3765a8f6820615323104c1d2bccf603742d6ddf34146b278919a02afc94ae1badc85ae7d5649fa614bc863ad67cb9e81d7f7145cc1a7d8f1e81cfa05e2319fbfd50a322e44b5d3f3528c34110c49cd522aeef74096edf8d158fb879a0f47043b5151a26019c9a779b39a792f1ad9b4718ffef2c82d8aa37756d09dd1780f851a0dc719106825e34250cab4ec2111b8cfaf250d61d2572c87f186b2c93e5c25a63a0f2019318c4e0165fb879c934ca3adfe4dd616a20d5888b555859ff4943de439c808080808080808080808080808080f87120b86ef86c27851e803563b38252089457a3692b49cc8be524f9bb713dcbd12e315b0a4188016345785d8a00008026a01b4cd5846cdae1c0318b54d9a8b8aaab201e25762a6036a3a126755918803981a0452637598ae9ff7c0159e595db54bab34862319789a1a6f67861efc096f48b90';
        // Ethereum mainnet block #10638830 transactionsRoot.
        const localRootHash = '0x973a224acfb632a658cce34cc673ea07cd3897b9b050af01283ef16e7f657555';
        const depositNonce = 2;
        const depositData = Helpers.createERCDepositData(
            0,
            lenRecipientAddress,
            recipientAddress);
        const customPreimagePart = localRootHash.slice(2) + localKey.slice(2) + localNodes.slice(2) +
            aggregatePublicKey.slice(2) + hashedMessage.slice(2) + signatureHeader.slice(2);
        const depositDataHash = Ethers.utils.keccak256(ERC20HandlerInstance.address + depositData.substr(2) + customPreimagePart);

        await deposit(erc20ResourceID, depositData);
        await vote(erc20ResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await BridgeInstance.executeProposal(chainID, depositNonce, depositData, erc20ResourceID, signatureHeader, aggregatePublicKey, hashedMessage, localRootHash, localKey, localNodes);

        gasBenchmarks.push({
            type: 'ERC20 - 242 elements MPT',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should execute proposal with 50 elements in the MPT', async () => {
        // key for transactionIndex 25 = rlp(25) = 0x19
        const localKey = '0x0109';
        // Constructed from Ethereum mainnet block #3999993 transactions trie.
        const localNodes = '0xf9033cf8b1a0a6c44fc07aee870dec488d42c023384d382b0a3c29473ae050fb99a7a428f080a06b0309ff8008deb648d50ca4814c28a740367e83b78f09327f54067bafba566fa0bf5a15cb893423a626f3603bb4cd265aad04a399a8569d920050d42025649731a01af461b85de39e27dfd549d7beab1bc8c2f2715b339bdd8ffdd8cda139b48e1880808080a0ff0ce3c19abddde8cc710380be01fd1c156b6ef9b669fe73c54d606082d8bc6d8080808080808080f90211a0e4b223870fc51e8366014ef17a328ecbac23fc51424f3e4fc3cdf2fd4d271552a0673117f614a315ac1f218d5824936da8e8439171f2d7d6d6097c2a0d7967e130a011da24159235a145435a54213918f16311fbc09fd33f000f5e44b65aa4e15774a08c992788f0eecfb52c30501405ecca614ea7ed302238c216d217a37e00a9cbbba0e6ee8701d0f619fc162d19834a257aa8b431787ddafbf994d2a14d7630d09bc7a0ab5e548c1b572ac589daf9389415acb901df3588a3ab76defe0146b743617fcfa047db12e190ae9765434ed6e603d6b9bcfad780ce4b072cc47f89df72185ebf54a064e3fe93f1abd65e5bb1fa9c1e2c4b4b8d13a008626250f7853fcd5b186b7611a0be80793c57f54d709fd36386f28012796eb915a2eba98d565861dfc09ef859d1a035a52613e9e99b815e3c2fd30b8c06e2db503b419d68392f599c9b779ec63db1a093d45d1ba35f8357ecc22641e768c9fbf050bdcd9b09c579757c919eb23438dba01e1136aa857bcd9240a19c9348edcfb8c114f762637affbeedc8d8a8caa4d0aea0cb23aaa9aa4db627f8abb78f21c23c01acb6532124b18dc2388adc06c825a663a0073ce1ca46b59aa002fd0dbc8c354b0b72485540596eade6b01c2532c13828ada026d7a1ed9e8ea13fc1cc99ace2548e44aeb1b2503bd351969b36afd0356ba436a02fbc55eaadf34c0f07782ee9846f2cd2c4522eefa1326391045cb005e34cfdd280f87320b870f86e832399c284ee6b280082c350940d13f06de3bb229913c13d97424f7f875e2af6ce8802cd23f2af676c008025a00a70ff329efdaeb49e85bda048dc3d30a86334cac657f3fac6c11a1dae33e8f6a0621ed899dc69baf3c55d3a17d196258416fbf871f7aedd5494976284da61863b';
        // Ethereum mainnet block #3999993 transactionsRoot.
        const localRootHash = '0x8649c3b1adbea6d8b4a8bc78ece9d78cea881e801bbea47bb8b5994401feeee1';
        const depositNonce = 3;
        const depositData = Helpers.createERCDepositData(
            0,
            lenRecipientAddress,
            recipientAddress);
        const customPreimagePart = localRootHash.slice(2) + localKey.slice(2) + localNodes.slice(2) +
            aggregatePublicKey.slice(2) + hashedMessage.slice(2) + signatureHeader.slice(2);
        const depositDataHash = Ethers.utils.keccak256(ERC20HandlerInstance.address + depositData.substr(2) + customPreimagePart);

        await deposit(erc20ResourceID, depositData);
        await vote(erc20ResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await BridgeInstance.executeProposal(chainID, depositNonce, depositData, erc20ResourceID, signatureHeader, aggregatePublicKey, hashedMessage, localRootHash, localKey, localNodes);

        gasBenchmarks.push({
            type: 'ERC20 - 50 elements MPT',
            gasUsed: executeTx.receipt.gasUsed
        });
    });
    
    it('Should print out benchmarks', () => console.table(gasBenchmarks));
});
