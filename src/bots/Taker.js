const Bot = require('./Bot.js');
const api = require('../api.js');
const { getOracleData, bytes320x } = require('../utils.js');

module.exports = class Taker extends Bot {
  async elementsLength () {
    try {
      return await process.contracts.auction.methods.getAuctionsLength().call();
    } catch (error) {
      console.log('#Taker/elementsLength/Error:\n', error);
      return 0;
    }
  }

  async createElement (auctionId) {
    try {
      const auction = await process.contracts.auction.methods.auctions(auctionId).call();

      const entryId = await process.contracts.collateral.methods.auctionToEntry(auctionId).call();
      const entry = await process.contracts.collateral.methods.entries(entryId).call();
      const debtOracle = (await process.contracts.debtEngine.methods.debts(entry.debtId).call()).oracle;

      const baseToken = await process.contracts.collateral.methods.loanManagerToken().call();

      return {
        debtOracle,
        id: auction.fromToken == baseToken ? bytes320x : auctionId,
      };
    } catch (error) {
      api.reportError('#Taker/createElement/Error', auctionId, error);
      return false;
    }
  }

  async isAlive (auction) {
    try {
      auction.auctionOnChain = await process.contracts.auction.methods.auctions(auction.id).call();

      if (auction && auction.auctionOnChain.amount != '0')
        return { alive: true};
      else
        return { alive: false, reason: 'The auction was bougth or not exists' };
    } catch (error) {
      api.reportError('#Taker/isAlive/Error', auction, error);
      return { alive: false, reason: 'The isAlive function have an error' };
    }
  }

  async canSendTx (auction) {
    try {
      // When take an auction?
      return true;
    } catch (error) {
      api.reportError('#Taker/canSendTx/Error', auction, error);
      return false;
    }
  }

  async sendTx (auction) {
    const debtOracleData = await getOracleData(auction.debtOracle);

    const tx = await process.walletManager.sendTx(
      process.contracts.auction.methods.take(
        auction.id,     // Auction id, in uint256
        debtOracleData, // Oracle data of the debt
        false           // If the auction contract, call the "onTake(uint256,uint256)" function
      )
    );

    if (tx instanceof Error) {
      api.reportError('#Taker/sendTx/Auction on Error', auction, tx);
      auction.inError = true;
    }
  }

  elementsAliveLog () {
    console.log('#Taker/Total Auctions alive:', this.totalAliveElement);
  }
};