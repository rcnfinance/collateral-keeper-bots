const program = require('commander');
const Web3 = require('web3');
const WalletManager = require('./WalletManager.js');

module.exports = async () => {
  console.log('Start Log:', Date().toString());

  program
    .option(
      '-p, --pks <addresses>',
      'A private key',
      (addresses) => addresses.split(',')
    )
    .option(
      '-c, --claim',
      'Execute Claim bot',
    )
    .option(
      '-t, --take',
      'Execute Take bot',
    )
    .parse(process.argv);

  process.env = require('../environment.js');
  process.web3 = new Web3(new Web3.providers.HttpProvider(process.env.node));
  process.contracts = await require('./contracts.js')();
  process.walletManager = new WalletManager(program.pks);

  process.takeOn = program.take;
  process.claimOn = program.claim;
};
