const Bot = require('./Bot.js');
const { DEBT_STATUS, bn, address0x, bytes32, bytes320x, getLastBlock } = require('../utils/utils.js');
const { toBaseToken } = require('../utils/utilsOracle.js');

module.exports = class Claimer extends Bot {
  constructor() {
    super();
  }

  elementsLog (elementLength) {
    console.log('#Claimer/Total Entries:', bn(elementLength).sub(bn(1)).toString());
  }

  async elementsLength () {
    return process.contracts.collateral.methods.getEntriesLength().call();
  }

  async createElement (elementId) {
    const entry = await process.contracts.collateral.methods.entries(elementId).call();
    const owner = await process.contracts.collateral.methods.ownerOf(elementId).call();
    const debt = (await process.contracts.debtEngine.methods.debts(entry.debtId).call());

    return {
      entryId: elementId,
      owner: owner,
      debtId: entry.debtId,
      oracle: entry.oracle,
      token: bn(entry.token),
      liquidationRatio: bn(entry.liquidationRatio),
      balanceRatio: bn(entry.balanceRatio),
      sender: address0x,
      debt: {
        model: debt.model,
        oracle: debt.oracle,
      },
    };
  }

  async canSendTx (localElement) {
    return await this.isAlive(localElement) &&
      (await this.isInLiquidation(localElement) || await this.isExpired(localElement));
  }

  async getTx (localElement) {
    return process.contracts.collateral.methods.claim(
      address0x,
      localElement.debtId,
      '0x' // TODO: send the oracle data
    );
  }

  async isAlive (localEntry) {
    const entry = await process.contracts.collateral.methods.entries(localEntry.entryId).call();

    if (!entry) // If the entry was deleted
      return false;

    const debtToEntry = await process.contracts.collateral.methods.debtToEntry(localEntry.debtId).call();
    const isCosigned = bytes32(debtToEntry) !== bytes320x;

    const debtStatus = await process.contracts.loanManager.methods.getStatus(localEntry.debtId).call();
    const isPaid = bn(debtStatus).eq(DEBT_STATUS.paid);
    const isInAuction = await process.contracts.collateral.methods.inAuction(localEntry.entryId).call();

    return isCosigned && !isPaid && !isInAuction;
  }

  async isExpired (localEntry) {
    process.contracts.model.options.address = localEntry.debt.model;
    const dueTime = await process.contracts.model.methods.getDueTime(localEntry.entryId).call();

    const lastBlock = await getLastBlock();
    const now = lastBlock.timestamp;

    return now > dueTime;
  }

  async isInLiquidation (localEntry) {
    const entry = await process.contracts.collateral.methods.entries(localEntry.entryId).call();
    const entryAmountInTokens = await toBaseToken(localEntry.oracle, bn(entry.amount));
    const obligationInToken = await this.obligationInToken(localEntry);
    const ratio = bn(entryAmountInTokens).div(bn(obligationInToken));

    return ratio.lt(localEntry.liquidationRatio);
  }

  async obligationInToken (localEntry) {
    process.contracts.model._address = localEntry.debt.model;
    const obligation = bn(await process.contracts.model.methods.getClosingObligation(localEntry.debtId).call());

    return toBaseToken(localEntry.oracle, obligation);
  }
};
