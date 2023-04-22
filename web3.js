const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const provider = new HDWalletProvider("Your Mnemonics", "Sepolia Network API");

const web3 = new Web3(provider);

module.exports = web3;
