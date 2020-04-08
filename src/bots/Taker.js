const Bot = require('./Bot.js');
const { bn, STATE } = require('../utils/utils.js');
const { getOracleData } = require('../utils/utilsOracle.js');

module.exports = class Taker extends Bot {
  constructor() {
    super();
  }

  elementsLog (elementLength) {
    console.log('#Taker/Total Auctions:', bn(elementLength).sub(bn(1)).toString());
  }

  async elementsLength () {
    return process.contracts.auction.methods.getAuctionsLength().call();
  }

  async createElement (elementId) {
    const entryId = await process.contracts.collateral.methods.auctionToEntry(elementId).call();
    const entry = await process.contracts.collateral.methods.entries(entryId).call();
    const debt = (await process.contracts.debtEngine.methods.debts(entry.debtId).call());
    const auction = await process.contracts.auction.methods.auctions(elementId).call();

    return {
      debt: {
        model: debt.model,
        oracle: debt.oracle,
      },
      id: elementId,
      fromToken: auction.fromToken,
      startTime: auction.startTime,
      limitDelta: auction.limitDelta,
      startOffer: auction.startOffer,
      amount: auction.amount,
      limit: auction.limit,
    };
  }

  async canSendTx (localElement) {
    const auction = await process.contracts.auction.methods.auctions(localElement.id).call();

    if (auction.startTime == 0) {
      localElement.state = STATE.finish;
      return false;
    } else {
      return true;
    }
  }

  async getTx (localElement) {
    const debtOracleData = await getOracleData(localElement.debt.oracle);

    return process.walletManager.sendTx(
      process.contracts.auction.methods.take(
        localElement.id, // Auction id, in uint256
        debtOracleData,  // Oracle data of the debt
        false            // If the auction contract, call the "onTake(uint256,uint256)" function
      )
    );
  }

  async approveAuction() {
    for (let i = 0; i < process.walletManager.addresses.length; i++) {
      const address = await process.walletManager.pop();
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
