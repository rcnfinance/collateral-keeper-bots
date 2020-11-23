const Bot = require('./Bot.js');
const api = require('../api.js');
const { PAID_DEBT_STATUS, address0x, getOracleData } = require('../utils.js');

let collMethods;
let debtEngineMethods;
let loanManagerMethods;
let callManager;

module.exports = class Claimer extends Bot {
  constructor() {
    super();

    collMethods = process.contracts.collateral.methods;
    debtEngineMethods = process.contracts.debtEngine.methods;
    loanManagerMethods = process.contracts.loanManager.methods;
    callManager = process.callManager;
  }

  async elementsLength() {
    return await callManager.multiCall(collMethods.getEntriesLength());
  }

  async createElement(id) {
    const entry = await callManager.multiCall(collMethods.entries(id));
    const debt = await callManager.multiCall(debtEngineMethods.debts(entry.debtId));

    return {
      id,
      entry,
      debtOracle: debt.oracle,
      diedReason: undefined,
    };
  }

  async isAlive(element) {
    if (element.diedReason)
      return;

    element.entry = await callManager.multiCall(collMethods.entries(element.id));
    if (!element.entry) { // If the entry was deleted
      element.diedReason = 'The entry was deleted or not exist';
      return;
    }

    const status = await callManager.multiCall(loanManagerMethods.getStatus(element.entry.debtId));

    if (status instanceof Error) {
      element.diedReason = 'Error on call: getStatus()';
    } else if (status === PAID_DEBT_STATUS) {
      element.diedReason = 'The debt of the entry was paid';
    }
  }

  async canSendTx(element) {
    const debtToEntry = await callManager.multiCall(collMethods.debtToEntry(element.entry.debtId));

    if (element.entry.amount == 0 || debtToEntry == 0)
      return false;

    const resp = await callManager.call(collMethods.canClaim(
      element.entry.debtId,
      await getOracleData(element.debtOracle)
    ));

    return !(resp instanceof Error) && resp;
  }

  async sendTx(element) {
    const debtOracleData = await getOracleData(element.debtOracle);

    await api.report('Entries', 'Send Claim', element);

    const tx = await process.walletManager.sendTx(
      collMethods.claim(
        address0x,
        element.entry.debtId,
        debtOracleData
      )
    );

    element.tx = tx;
    await api.report('Entries', 'Complete Claim', element);

    if (tx instanceof Error) {
      this.reportError( element, 'sendTx', tx);
      element.diedReason = 'Error on send the tx';
    }
  }

  elementsAliveLog() {
    console.log('#Claimer/Total Entries alive:', this.totalAliveElement);
    const entriesOnError = this.elementsDiedReasons.filter(e => e.reason !== 'The debt of the entry was paid');
    if (entriesOnError.length)
      console.log('\tEntries on error:', entriesOnError.map(e => e.id));
  }

  async reportNewElement(element) {
    await api.report('Entries', 'New element', element);
  }

  async reportEndElement(element) {
    await api.report('Entries', 'End element', element);
  }

  async reportError(element, funcName, error) {
    await api.report('EntriesErrors', { element, funcName, error });
  }
};
