const program = require('commander');
const Web3 = require('web3');
const WalletManager = require('./WalletManager.js');
const CallManager = require('./CallManager.js');

function splitAddresses(addresses) {
  return addresses.split(',');
}

module.exports = async () => {
  console.log('Start Log:', Date().toString());

  program
    .option(
      '-p, --pks [addresses]',
      'A private key',
      process.env.BOT_PKS
    )
    .option(
      '-c, --claim',
      'Execute Claim bot'
    )
    .option(
      '-t, --take',
      'Execute Take bot'
    )
    //.option(
    //  '-r, --reporter',
    //  'Execute Reporter',
    //)
    .option(
      '-n, --node <url>',
      'URL Node Ethereum',
      process.env.URL_NODE_ETHEREUM
    )
    .option(
      '-c, --collateralAddress <address>',
      'Collateral address',
      process.env.COLLATERAL_ADDRESS
    )
    .parse(process.argv);


  process.environment = program.opts();
  // fix process pks split
  process.environment.pks = splitAddresses(process.environment.pks);
  process.web3 = new Web3(new Web3.providers.HttpProvider(process.environment.node));
  process.contracts = await require('./contracts.js')();

  process.walletManager = new WalletManager(process.environment.pks);
  process.callManager = new CallManager();


  process.takeOn = process.environment.take;
  process.claimOn = process.environment.claim;
  //process.reporterOn = process.environment.claim;
};
