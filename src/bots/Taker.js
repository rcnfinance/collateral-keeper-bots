const config = require('../../config.js');
const Bot = require('./Bot.js');
const { getOracleData, bn, getContracts, web3 } = require('../utils.js');
const callManager = require('../CallManager.js');
const walletManager = require('../WalletManager.js');

let auctionMethods;
let collMethods;
let takeMethods;
let debtEngineMethods;

class Taker extends Bot {
  constructor() {
    super();
  }

  async init() {
    const contracts = await getContracts();

    collMethods = contracts.collateral.methods;
    auctionMethods = contracts.auction.methods;
    takeMethods = contracts.auctionTakeHelper.methods;
    debtEngineMethods = contracts.debtEngine.methods;

    this.baseToken = await callManager.multiCall(collMethods.loanManagerToken());
  }

  async elementsLength() {
    return await callManager.multiCall(auctionMethods.getAuctionsLength());
  }

  async createElement(id) {
    const auction = await callManager.multiCall(auctionMethods.auctions(id));

    const entryId = await callManager.multiCall(collMethods.auctionToEntry(id));
    const entry = await callManager.multiCall(collMethods.entries(entryId));
    const debt = await callManager.multiCall(debtEngineMethods.debts(entry.debtId));

    return {
      id,
      auction,
      debtOracle: debt.oracle,
    };
  }

  async isAlive(element) {
    if (element.diedReason)
      return;

    element.auction = await callManager.multiCall(auctionMethods.auctions(element.id));

    if (element.auction && element.auction.amount != 0) {
      if (element.auction.fromToken == this.baseToken && !config.SUBSIDEZE_TAKE_IN_BASETOKEN) {
        element.diedReason = 'The auction was no subsideze';
      }
    } else {
      element.diedReason = 'The auction was bougth or not exists';
    }
  }

  async canSendTx(element) {
    try {
      const debtOracleData = await getOracleData(element.debtOracle);
      element.method = {
        func: takeMethods.take(
          element.id,     // Auction id, in uint256
          debtOracleData, // Oracle data of the debt
          0               // Amount what should be win in weth
        )
      };

      element.method.gas = await walletManager.estimateGas(element.method.func);

      if (element.method.gas instanceof Error)
        return false;

      element.method.gasPrice = await web3.eth.getGasPrice();

      if (element.auction.fromToken == this.baseToken) {
        // The fromToken is in baseToken
        return config.SUBSIDEZE_TAKE_IN_BASETOKEN;
      } else {
        // Calc profit in weth
        element.method.func.arguments[2] = bn(config.AUCTION_TAKER_PROFIT);
        if (!config.SUBSIDEZE_TX_TAKE) {
          const profit = bn(element.method.gasPrice).mul(bn(element.method.gas));
          element.method.func.arguments[2] = element.method.func.arguments[2].add(profit);
        }

        element.method.gas = await walletManager.estimateGas(element.method.func);

        if (element.method.gas instanceof Error)
          return false;

        return true;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async sendTx(element) {
    const tx = await walletManager.sendTx(
      element.method.func,
      {
        gas: element.method.gas,
        gasPrice: element.method.gasPrice,
      }
    );

    element.tx = tx;

    if (tx instanceof Error) {
      console.log( element, 'sendTx', tx);
    }
  }

  elementsAliveLog() {
    console.log('#Taker/Total Auctions alive:', this.totalAliveElement);

    const auctionsOnError = this.elementsDiedReasons.filter(e => e.reason !== 'The auction was bougth or not exists');
    if (auctionsOnError.length)
      console.log('\tAuctions on error:', auctionsOnError);
  }
};

module.exports = new Taker();