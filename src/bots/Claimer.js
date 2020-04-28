const Bot = require('./Bot.js');
const { PAID_DEBT_STATUS, address0x, getOracleData } = require('../utils.js');

module.exports = class Claimer extends Bot {
  elementsAliveLog () {
    console.log('#Claimer/Total Entries alive:', this.totalAliveElement);
  }

  addElementLog (entryId) {
    console.log('#Claimer/Add Entry:', entryId);
  }

  removeElementLog (entryId) {
    console.log('#Claimer/Remove Entry:', entryId);
  }

  async elementsLength () {
    return process.contracts.collateral.methods.getEntriesLength().call();
  }

  async createElement (entryId) {
    const entry = await process.contracts.collateral.methods.entries(entryId).call();
    const debt = await process.contracts.debtEngine.methods.debts(entry.debtId).call();

    return {
      entryId: entryId,
      debtId: entry.debtId,
      debtOracle: debt.oracle,
    };
  }

  async canSendTx (localEntry) {
    // TODO the tx is in the mempool of the vm???
    const entryId = await process.contracts.collateral.methods.debtToEntry(localEntry.debtId).call();
    if (entryId === '0')
      return false;

    const entry = await process.contracts.collateral.methods.entries(entryId).call();
    if (entry.amount === '0')
      return false;

    const debtOracleData = await getOracleData(localEntry.debtOracle);

    const canClaim = await process.contracts.collateral.methods.canClaim(
      localEntry.debtId,
      debtOracleData
    ).call();

    return canClaim;
  }

  async sendTx (localEntry) {
    const debtOracleData = await getOracleData(localEntry.debtOracle);

    const tx = await process.walletManager.sendTx(
      process.contracts.collateral.methods.claim(
        address0x,
        localEntry.debtId,
        debtOracleData
      )
    );

    if (tx instanceof Error)
      console.log('#Claimer/sendTx/Entry on Error:', localEntry.entryId);
  }

  async isAlive (localEntry) {
    const entry = await process.contracts.collateral.methods.entries(localEntry.entryId).call();

    const debtToEntry = await process.contracts.collateral.methods.debtToEntry(localEntry.debtId).call();
    if (debtToEntry == 0 || debtToEntry == localEntry.entryId)
      return false;

    if (!entry) // If the entry was deleted
      return false;

    const debtStatus = await process.contracts.loanManager.methods.getStatus(localEntry.debtId).call();
    return debtStatus !== PAID_DEBT_STATUS;
  }
};
