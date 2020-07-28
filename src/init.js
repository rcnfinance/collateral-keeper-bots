const Web3 = require('web3');

const WalletManager = require('./WalletManager.js');
const CallManager = require('./CallManager.js');

module.exports = async () => {
  console.log('Start Log:', Date().toString());

  process.configDefault = require('../configDefault.js')();
  console.log(process.configDefault);
  process.web3 = new Web3(new Web3.providers.HttpProvider(process.configDefault.URL_NODE_ETHEREUM));
  process.contracts = await require('./contracts.js')();

  // fix process pks split
  // process.configDefault.BOT_PKS = splitAddresses(process.configDefault.BOT_PKS);
  process.walletManager = new WalletManager([ process.configDefault.BOT_PKS ]);
  process.callManager = new CallManager();

  process.takeOn = process.configDefault.TAKE;
  process.claimOn = process.configDefault.CLAIM;
};

function splitAddresses(addresses) {
  return addresses.split(',');
}