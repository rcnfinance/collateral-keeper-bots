const program = require('commander');
const W3 = require('web3');
const Claimer = require('./src/bots/Claimer.js');
const Taker = require('./src/bots/Taker.js');
const WalletManager = require('./src/WalletManager.js');

async function main() {
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

  process.env = require('./environment.js');
  process.w3 = new W3(new W3.providers.HttpProvider(process.env.node));
  process.contracts = await require('./src/contracts.js')();
  process.walletManager = new WalletManager(program.pks);

  if (program.take) {
    const taker = new Taker();
    await taker.approveAuction();
    taker.process();
  }

  if (program.claim) {
    const claimer = new Claimer();
    claimer.process();
  }
}

main();
