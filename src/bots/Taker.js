const Bot = require('./Bot.js');
const { getOracleData } = require('../utils.js');

module.exports = class Taker extends Bot {
  elementsAliveLog () {
    console.log('#Taker/Total Auctions alive:', this.totalAliveElement);
  }

  addElementLog (auctionId) {
    console.log('#Taker/Add Auction:', auctionId);
  }

  removeElementLog (auctionId) {
    console.log('#Taker/Remove Auction:', auctionId);
  }

  async elementsLength () {
    return process.contracts.auction.methods.getAuctionsLength().call();
  }

  async createElement (auctionId) {
    const auction = await process.contracts.auction.methods.auctions(auctionId).call();

    const entryId = await process.contracts.collateral.methods.auctionToEntry(auctionId).call();
    const entry = await process.contracts.collateral.methods.entries(entryId).call();
    const debt = (await process.contracts.debtEngine.methods.debts(entry.debtId).call());

    const baseToken = await process.contracts.collateral.methods.loanManagerToken().call();

    return {
      debtOracle: debt.oracle,
      id: auction.fromToken == baseToken ? 0 : auctionId,
    };
  }

  async canSendTx (localAuction) {
    const auction = await process.contracts.auction.methods.auctions(localAuction.id).call();

    return auction.startTime !== '0';
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
    if (localAuction.inError)
      return false;

    const auction = await process.contracts.auction.methods.auctions(localAuction.id).call();

    if (auction)
      return auction.startTime != 0;
    else
      return false;
  }
};
/*
  async approveAuction() {
    for (let i = 0; i < process.walletManager.addresses.length; i++) {
      const address = process.walletManager.pop();
      const baseToken = process.contracts.baseToken;
      const auction = process.contracts.auction;
      const allowance = bn(await baseToken.methods.allowance(address, auction._address).call());

      if (allowance.isZero()) {
        const approveFunction = baseToken.methods.approve(
          auction._address,
          process.w3.utils.toTwosComplement(-1)
        );

        process.walletManager.sendTx(approveFunction, { address: address });
      }

      process.walletManager.push(address);
    }
  }
};
*/