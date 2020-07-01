const Bot = require('./Bot.js');
const api = require('../api.js');
const { PAID_DEBT_STATUS, address0x, getOracleData } = require('../utils.js');

module.exports = class Claimer extends Bot {
  async elementsLength () {
    try {
      return await process.contracts.collateral.methods.getEntriesLength().call();
    } catch (error) {
      console.log('#Claimer/elementsLength/Error:\n', error);
      return 0;
    }
  }

  async createElement (entryId) {
    try {
      const debtId = (await process.contracts.collateral.methods.entries(entryId).call()).debtId;
      const debtOracle = (await process.contracts.debtEngine.methods.debts(debtId).call()).oracle;

      return {
        entryId,
        debtId,
        debtOracle,
      };
    } catch (error) {
      api.reportError('#Claimer/createElement/Error', entryId, error);
      return false;
    }
  }

  async isAlive (localEntry) {
    try {
      const entry = await process.contracts.collateral.methods.entries(localEntry.entryId).call();
      if (!entry) // If the entry was deleted
        return 'The entry was deleted or not exist';

      const debtStatus = await process.contracts.loanManager.methods.getStatus(localEntry.debtId).call();
      if (debtStatus !== PAID_DEBT_STATUS)
        return { alive: true };
      else
        return { alive: false, reason: 'The debt of the entry was paid' };
    } catch (error) {
      api.reportError('#Claimer/isAlive/Error', localEntry, error);
      return { alive: false, reason: 'The isAlive function have an error' };
    }
  }

  async canSendTx (localEntry) {
    try {
      const entry = await process.contracts.collateral.methods.entries(localEntry.entryId).call();
      const debtToEntry = await process.contracts.collateral.methods.debtToEntry(localEntry.debtId).call();

      if (entry.amount == 0 || debtToEntry == 0)
        return false;

      return await process.contracts.collateral.methods.canClaim(
        localEntry.debtId,
        await getOracleData(localEntry.debtOracle)
      ).call();
    } catch (error) {
      api.reportError('#Claimer/canSendTx/Error', localEntry, error);
      return false;
    }
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
      api.reportError('#Claimer/sendTx/EntryOnError', localEntry, tx);
  }

  elementsAliveLog () {
    console.log('#Claimer/Total Entries alive:', this.totalAliveElement);
  }
};