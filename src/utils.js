const config = require('../config.js');
const Web3 = require('web3');

console.log(config);

const web3 = new Web3(new Web3.providers.HttpProvider(config.URL_NODE));

// auctions states
const STATE = {
  onGoing: 'onGoing',
  error: 'error',
  busy: 'busy',
  finish: 'finish',
};

const DEBT_STATUS = {
  null: bn(0),
  onGoing: bn(1),
  paid: bn(2),
  destroyed: bn(3),
  error: bn(4),
};

const address0x = '0x0000000000000000000000000000000000000000';
const bytes320x = '0x0000000000000000000000000000000000000000000000000000000000000000';

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleepThread ()  {
  return sleep(config.AWAIT_THREAD);
};

function bn (number) {
  return web3.utils.toBN(number);
}

function bytes32 (number) {
  return web3.utils.toTwosComplement(number);
}

async function getLastBlock () {
  let lastBlock = await web3.eth.getBlock(await web3.eth.getBlockNumber()); // This can return a null block

  while (lastBlock === null) {
    console.log('Warning: utils.getLastBlock() in utils.js, returns a null last block');
    lastBlock = await web3.eth.getBlock(await web3.eth.getBlockNumber());
  }
  return lastBlock;
};

async function getBlock (number = 'latest') {
  for (let block, i = 0; ; await sleep(++i * 100)) {
    try {
      block = await web3.eth.getBlock(number);
    } catch (error) {
      console.log('#Utils/getBLock/Error', '\n', error.message);
    }

    if (block)
      return block;
  }
};

function initWallet () {
  if (config.BOT_PK.slice(0, 2) !== '0x')
    throw new Error('Wallet Manager/ Wrong format: \n' + config.BOT_PK + ', use a hex bytes32 number(with 0x on the beginning)');

  if (web3.utils.isHexStrict(config.BOT_PK.slice(2)))
    throw new Error('Wallet Manager/ There are no private keys to instance the signers: ' + config.BOT_PK);

  const wallet = web3.eth.accounts.privateKeyToAccount(config.BOT_PK);
  web3.eth.accounts.wallet.add(wallet);

  return wallet.address;
}

async function getContracts () {
  const contracts = {};

  contracts.multicall = await new web3.eth.Contract(
    require('./abis/Multicall.json'),
    config.MULTICALL_ADDRESS
  );

  contracts.auctionTakeHelper = await new web3.eth.Contract(
    require('./abis/AuctionTakeHelper.json'),
    config.AUCTION_TAKER_HELPER
  );

  contracts.collateral = await new web3.eth.Contract(
    require('./abis/Collateral.json'),
    config.COLLATERAL_ADDRESS
  );

  const auctionAddress = await contracts.collateral.methods.auction().call();
  contracts.auction = await new web3.eth.Contract(
    require('./abis/CollateralAuction.json'),
    auctionAddress
  );
  const loanManagerAddress = await contracts.collateral.methods.loanManager().call();
  contracts.loanManager = await new web3.eth.Contract(
    require('./abis/LoanManager.json'),
    loanManagerAddress
  );

  const debtEngineAddress = await contracts.loanManager.methods.debtEngine().call();
  contracts.debtEngine = await new web3.eth.Contract(
    require('./abis/DebtEngine.json'),
    debtEngineAddress
  );

  const baseTokenAddress = await contracts.debtEngine.methods.token().call();
  contracts.baseToken = await new web3.eth.Contract(
    require('./abis/ERC20.json'),
    baseTokenAddress
  );

  contracts.rateOracle = await new web3.eth.Contract(require('./abis/RateOracle.json'));

  return contracts;
};

async function getOracleData (oracle) {
  if (oracle === this.address0x)
    return '0x';

  return '0x';

  // TODO If the oracle needs a data
  process.contracts.rateOracle.methods.url().to = oracle;
  const oracleUrl = await process.callManager.call(
    process.contracts.rateOracle.methods.url()
  );

  // If dont have URL, the oracle data its empty
  if (oracleUrl instanceof Error || oracleUrl == '0x' || oracleUrl == '' || oracleUrl == null)
    return '0x';

  throw new Error('TODO: get oracle data from url and return the oracle data:', oracleUrl);
};

module.exports = {
  STATE,
  DEBT_STATUS,
  web3,
  address0x,
  bytes320x,
  sleep,
  sleepThread,
  bn,
  bytes32,
  getBlock,
  initWallet,
  getContracts,
  getOracleData,
};