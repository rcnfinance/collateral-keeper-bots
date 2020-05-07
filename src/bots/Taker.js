const Bot = require('./Bot.js');
const { getOracleData } = require('../utils.js');

module.exports = class Taker extends Bot {
  elementsAliveLog () {
    console.log('#Taker/Total Auctions alive:', this.totalAliveElement);
  }

  async elementsLength () {
    try {
      return await process.contracts.auction.methods.getAuctionsLength().call();
    } catch (error) {
      console.log('#Taker/elementsLength/Error:\n', error);
      return '0';
    }
  }

  async createElement (auctionId) {
    const auction = await process.contracts.auction.methods.auctions(auctionId).call();

    const entryId = await process.contracts.collateral.methods.auctionToEntry(auctionId).call();
    const entry = await process.contracts.collateral.methods.entries(entryId).call();
    const debtOracle = (await process.contracts.debtEngine.methods.debts(entry.debtId).call()).oracle;

    const baseToken = await process.contracts.collateral.methods.loanManagerToken().call();

    return {
      debtOracle,
      id: auction.fromToken == baseToken ? 0 : auctionId,
    };
  }

  async canSendTx (localAuction) {
    try {
      const auction = await process.contracts.auction.methods.auctions(localAuction.id).call();

      return auction.startTime !== '0';
    } catch (error) {
      console.log('#Taker/canSendTx/Error:\n', error);
      return false;
    }
  }

  async sendTx (localAuction) {
    const debtOracleData = await getOracleData(localAuction.debtOracle);

    const tx = await process.walletManager.sendTx(
      process.contracts.auction.methods.take(
        localAuction.id, // Auction id, in uint256
        debtOracleData,  // Oracle data of the debt
        false            // If the auction contract, call the "onTake(uint256,uint256)" function
      )
    );

    if (tx instanceof Error) {
      console.log('#Taker/sendTx/Auction on Error:', localAuction.id);
      localAuction.inError = true;
    }
  }

  async isAlive (localAuction) {
    try {
      if (localAuction.inError)
        return false;

      const auction = await process.contracts.auction.methods.auctions(localAuction.id).call();

      if (auction)
        return auction.startTime != 0;
      else
        return false;
    } catch (error) {
      console.log('#Taker/isAlive/Error:\n', error);
      return false;
    }
  }
};