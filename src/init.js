const Web3 = require('web3');

const WalletManager = require('./WalletManager.js');
const CallManager = require('./CallManager.js');

module.exports = async () => {
  console.log('Start Log:', Date().toString());

  process.configDefault = require('../configDefault.js');
  process.web3 = new Web3(new Web3.providers.HttpProvider(process.env.URL_NODE_ETHEREUM));
  console.log(process.configDefault);
  process.contracts = await require('./contracts.js')();

  // fix process pks split
  // process.configDefault.BOT_PKS = splitAddresses(process.env.BOT_PKS);
  process.walletManager = new WalletManager([ process.env.BOT_PKS ]);
  process.callManager = new CallManager();

  process.takeOn = process.env.TAKE;
  process.claimOn = process.env.CLAIM;
  //process.reporterOn = process.env.REPORTER;
};

function splitAddresses(addresses) {
  return addresses.split(',');
}