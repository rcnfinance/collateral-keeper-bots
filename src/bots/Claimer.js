const Bot = require('./Bot.js');
const { PAID_DEBT_STATUS, address0x, getOracleData } = require('../utils.js');

module.exports = class Claimer extends Bot {
  elementsAliveLog () {
    console.log('#Claimer/Total Entries alive:', this.totalAliveElement);
  }

  async elementsLength () {
    try {
      return await process.contracts.collateral.methods.getEntriesLength().call();
    } catch (error) {
      console.log('#Claimer/elementsLength/Error:\n', error.message);
      return '0';
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
      console.log('#Claimer/createElement/Error:\n', error.message);
      return false;
    }
  }

  async canSendTx (localEntry) {
    try {
      const entry = await process.contracts.collateral.methods.entries(localEntry.entryId).call();
      if (entry.amount === '0')
        return false;

      return process.contracts.collateral.methods.canClaim(
        localEntry.debtId,
        await getOracleData(localEntry.debtOracle)
      );
    } catch (error) {
      console.log('#Claimer/canSendTx/Error:\n', error.message);
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
      console.log('#Claimer/sendTx/Entry on Error:', localEntry.entryId);
  }

  async isAlive (localEntry) {
    try {
      const entry = await process.contracts.collateral.methods.entries(localEntry.entryId).call();
      if (!entry) // If the entry was deleted
        return false;

      const debtToEntry = await process.contracts.collateral.methods.debtToEntry(localEntry.debtId).call();
      if (debtToEntry == 0 || debtToEntry == localEntry.entryId)
        return false;

      const debtStatus = await process.contracts.loanManager.methods.getStatus(localEntry.debtId).call();
      return debtStatus !== PAID_DEBT_STATUS;
    } catch (error) {
      console.log('#Claimer/isAlive/Error:\n', error.message);
      return false;
    }
  }
};
