const Bot = require('./Bot.js');
const api = require('../api.js');
const { bytes320x, getOracleData } = require('../utils.js');

let auctionMethods;
let collMethods;
let callManager;

module.exports = class Taker extends Bot {
  constructor() {
    super();

    auctionMethods = process.contracts.auction.methods;
    collMethods = process.contracts.collateral.methods;
    callManager = process.callManager;
  }

  async init() {
    this.baseToken = await callManager.call(collMethods.loanManagerToken());
  }

  async elementsLength() {
    return await callManager.call(auctionMethods.getAuctionsLength());
  }

  async getAuction(id) {
    const auction = await callManager.call(auctionMethods.auctions(id));

    return {
      fromToken: auction.fromToken,
      startTime: auction.startTime,
      limitDelta: auction.limitDelta,
      startOffer: auction.startOffer,
      amount: auction.amount,
      limit: auction.limit,
    };
  }

  async createElement(id) {
    const auction = await this.getAuction(id);

    const entryId = await callManager.call(collMethods.auctionToEntry(id));
    const entry = await callManager.call(collMethods.entries(entryId));
    const debt = await callManager.call(process.contracts.debtEngine.methods.debts(entry.debtId));

    return {
      id,
      auction,
      debtOracle: debt.oracle,
    };
  }

  async isAlive(element) {
    element.auction = await this.getAuction(element.id);

    if (element.auction && element.auction.amount != '0')
      return { alive: true};
    else
      return { alive: false, reason: 'The auction was bougth or not exists' };
  }

  async canSendTx(element) {
    try {
      // When take an auction?
      // if (element.auction.fromToken === this.baseToken)
      //   ;

      return true;
    } catch (error) {
      api.reportError('#Taker/canSendTx/Error', element, error);
      return false;
    }
  }

  async sendTx(element) {
    const debtOracleData = await getOracleData(element.debtOracle);

    const tx = await process.walletManager.sendTx(
      process.contracts.auction.methods.take(
        element.id,     // Auction id, in uint256
        debtOracleData, // Oracle data of the debt
        false           // If the auction contract, call the "onTake(uint256,uint256)" function
      )
    );

    if (tx instanceof Error) {
      await this.reportError( element, 'sendTx', tx);
    }
  }

  elementsAliveLog() {
    console.log('#Taker/Total Auctions alive:', this.totalAliveElement);
  }

  async reportNewElement(element) {
    await api.report('Auctions', element);
  }

  async reportEndElement(element) {
    await api.report('Auctions', element);
  }

  async reportError(element, funcName, error) {
    await api.report('AuctionsErrors', { element, funcName, error });
  }
};