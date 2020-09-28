const Bot = require('./Bot.js');
const api = require('../api.js');
const { getOracleData, bn } = require('../utils.js');

let auctionMethods;
let collMethods;
let takeMethods;
let callManager;

module.exports = class Taker extends Bot {
  constructor() {
    super();

    auctionMethods = process.contracts.auction.methods;
    collMethods = process.contracts.collateral.methods;
    takeMethods = process.contracts.auctionTakeHelper.methods;
    callManager = process.callManager;
  }

  async init() {
    this.baseToken = await callManager.multiCall(collMethods.loanManagerToken());
  }

  async elementsLength() {
    return await callManager.multiCall(auctionMethods.getAuctionsLength());
  }

  async createElement(id) {
    const auction = await callManager.multiCall(auctionMethods.auctions(id));

    const entryId = await callManager.multiCall(collMethods.auctionToEntry(id));
    const entry = await callManager.multiCall(collMethods.entries(entryId));
    const debt = await callManager.multiCall(process.contracts.debtEngine.methods.debts(entry.debtId));

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
      if (element.auction.fromToken == this.baseToken && !process.configDefault.SUBSIDEZE_TAKE) {
        element.diedReason = 'The auction was now subsideze';
      }
    } else {
      element.diedReason = 'The auction was bougth or not exists';
    }
  }

  async canSendTx(element) {
    try {
      const a = await takeMethods.getProfitAmount(element.id).call();
      console.log(a.toString());

      const debtOracleData = await getOracleData(element.debtOracle);
      element.method = {
        func: takeMethods.take(
          element.id,     // Auction id, in uint256
          debtOracleData, // Oracle data of the debt
          0               // Amount what should be win in weth
        )
      };

      element.method.gas = await process.walletManager.estimateGas(element.method.func);
      element.method.gasPrice = await process.web3.eth.getGasPrice();

      if (element.auction.fromToken == this.baseToken) {
        // The fromToken is in baseToken
        return process.configDefault.SUBSIDEZE_TAKE;
      } else {
        // Calc profit in weth
        //const profit = bn(element.method.gasPrice).mul(bn(element.method.gas)).add(bn(process.configDefault.AUCTION_TAKER_PROFIT)); // 0.035 ETH
        element.method.func.arguments[2] = 0;

        element.method.gas = await process.walletManager.estimateGas(element.method.func);

        if (element.method.gas instanceof Error)
          return false;

        return true;
      }
    } catch (error) {
      api.reportError(element, 'canSendTx', error);
      console.log(error);
      return false;
    }
  }

  async sendTx(element) {
    await api.report('Auctions', 'Send Claim', element);

    const tx = await process.walletManager.sendTx(
      element.method.func,
      {
        gas: element.method.gas,
        gasPrice: element.method.gasPrice,
      }
    );

    element.tx = tx;
    await api.report('Auctions', 'Complete Claim', element);

    if (tx instanceof Error) {
      this.reportError( element, 'sendTx', tx);
    }
  }

  elementsAliveLog() {
    console.log('#Taker/Total Auctions alive:', this.totalAliveElement);

    const auctionsOnError = this.elementsDiedReasons.filter(e => e.reason !== 'The auction was bougth or not exists');
    if (auctionsOnError.length)
      console.log('\tAuctions on error:', auctionsOnError);
  }

  async reportNewElement(element) {
    await api.report('Auctions', 'New element', element);
  }

  async reportEndElement(element) {
    await api.report('Auctions', 'End element', element);
  }

  async reportError(element, funcName, error) {
    await api.report('AuctionsErrors', { element, funcName, error });
  }
};