const Bot = require('./Bot.js');
const api = require('../api.js');
const { getOracleData, bytes320x } = require('../utils.js');

module.exports = class Taker extends Bot {
  async elementsLength() {
    try {
      return await process.contracts.auction.methods.getAuctionsLength().call();
    } catch (error) {
      console.log('#Taker/elementsLength/Error:\n', error);
      return 0;
    }
  }

  async getAuction(id) {
    const auction = await process.contracts.auction.methods.auctions(id).call();

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
    try {
      const auction = await this.getAuction(id);

      const entryId = await process.contracts.collateral.methods.auctionToEntry(id).call();
      const entry = await process.contracts.collateral.methods.entries(entryId).call();
      const debtOracle = (await process.contracts.debtEngine.methods.debts(entry.debtId).call()).oracle;

      const baseToken = await process.contracts.collateral.methods.loanManagerToken().call();

      return {
        id: auction.fromToken == baseToken ? bytes320x : id,
        auction,
        debtOracle,
      };
    } catch (error) {
      api.reportError('#Taker/createElement/Error', id, error);
      return false;
    }
  }

  async isAlive(element) {
    try {
      element.auction = await this.getAuction(element.id);

      if (element.auction && element.auction.amount != '0')
        return { alive: true};
      else
        return { alive: false, reason: 'The auction was bougth or not exists' };
    } catch (error) {
      api.reportError('#Taker/isAlive/Error', element, error);
      return { alive: false, reason: 'The isAlive function have an error' };
    }
  }

  async canSendTx(element) {
    try {
      // When take an auction?
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
      api.reportError('#Taker/sendTx/Auction on Error', element, tx);
    }
  }

  elementsAliveLog() {
    console.log('#Taker/Total Auctions alive:', this.totalAliveElement);
  }
};