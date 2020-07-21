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

  async getEntry(id) {
    const entry = await callManager.multiCall(collMethods.entries(id));

    return {
      debtId: entry.debtId,
      amount: entry.amount,
      oracle: entry.oracle,
      token: entry.token,
      liquidationRatio: entry.liquidationRatio,
      balanceRatio: entry.balanceRatio,
    };
  }

  async createElement(id) {
    const entry = await this.getEntry(id);
    const debt = await callManager.multiCall(debtEngineMethods.debts(entry.debtId));

    return {
      id,
      entry,
      debtOracle: debt.oracle
    };
  }

  async isAlive(element) {
    element.entry = await this.getEntry(element.id);
    if (!element.entry) // If the entry was deleted
      return 'The entry was deleted or not exist';

    const status = await callManager.multiCall(loanManagerMethods.getStatus(element.entry.debtId));

    if (status instanceof Error)
      return { alive: false, reason: 'Error on call: getStatus()'};
    else if (status !== PAID_DEBT_STATUS)
      return { alive: true };
    else
      return { alive: false, reason: 'The debt of the entry was paid' };
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

    element.action = 'Send Claim';
    await api.report('Entries', element);

    const tx = await process.walletManager.sendTx(
      collMethods.claim(
        address0x,
        element.entry.debtId,
        debtOracleData
      )
    );

    element.action = 'Complete Claim';
    element.tx = tx;
    await api.report('Entries', element);

    if (tx instanceof Error) {
      await this.reportError( element, 'sendTx', tx);
    }
  }

  elementsAliveLog() {
    console.log('#Claimer/Total Entries alive:', this.totalAliveElement);
  }

  async reportNewElement(element) {
    element.action = 'New element';
    await api.report('Entries', element);
  }

  async reportEndElement(element) {
    element.action = 'End element';
    await api.report('Entries', element);
  }

  async reportError(element, funcName, error) {
    await api.report('EntriesErrors', { element, funcName, error });
  }
};