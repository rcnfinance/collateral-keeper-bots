const Bot = require('./Bot.js');
const api = require('../api.js');
const { convertToken, getOracleData } = require('../utils.js');

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
    this.baseToken = await callManager.multiCall(collMethods.loanManagerToken());
  }

  async elementsLength() {
    return await callManager.multiCall(auctionMethods.getAuctionsLength());
  }

  async getAuction(id) {
    const auction = await callManager.multiCall(auctionMethods.auctions(id));

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

    const entryId = await callManager.multiCall(collMethods.auctionToEntry(id));
    const entry = await callManager.multiCall(collMethods.entries(entryId));
    const debt = await callManager.multiCall(process.contracts.debtEngine.methods.debts(entry.debtId));

    return {
      id,
      auction,
      entry,
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
      const offer = await callManager.multiCall(auctionMethods.offer(element.id));
      // In Base token
      const sendValue = offer.requesting;
      const getValue = await convertToken(element.entry.oracle, offer.selling);

      return sendValue < getValue;
    } catch (error) {
      api.reportError(element, 'canSendTx', error);
      return false;
    }
  }

  async sendTx(element) {
    const debtOracleData = await getOracleData(element.debtOracle);

    await api.report('Auctions', 'Send Claim',element);

    const tx = await process.walletManager.sendTx(
      process.contracts.auction.methods.take(
        element.id,     // Auction id, in uint256
        debtOracleData, // Oracle data of the debt
        false           // If the auction contract, call the "onTake(uint256,uint256)" function
      )
    );

    element.tx = tx;
    await api.report('Auctions', 'Complete Claim', element);

    if (tx instanceof Error) {
      this.reportError( element, 'sendTx', tx);
    }
  }

  elementsAliveLog() {
    console.log('#Taker/Total Auctions alive:', this.totalAliveElement);
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