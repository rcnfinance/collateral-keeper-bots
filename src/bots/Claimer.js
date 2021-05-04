const { Bot, totalAliveElement, elementsDiedReasons } = require('./Bot.js');
const { PAID_DEBT_STATUS, address0x, getOracleData, getContracts, STR } = require('../utils.js');
const callManager = require('../CallManager.js');
const walletManager = require('../WalletManager.js');

let collMethods;
let debtEngineMethods;
let loanManagerMethods;

const headLog = STR.cyan + 'Claimer:' + STR.reset;

class Claimer extends Bot {
  constructor() {
    super();
  }

  async init() {
    const contracts = await getContracts();

    collMethods = contracts.collateral.methods
    debtEngineMethods = contracts.debtEngine.methods
    loanManagerMethods = contracts.loanManager.methods
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

    const tx = await walletManager.sendTx(
      collMethods.claim(
        address0x,
        element.entry.debtId,
        debtOracleData
      )
    );

    element.tx = tx;

    if (tx instanceof Error) {
      element.diedReason = 'Error on send the tx';
    }
  }

  elementsAliveLog() {
    console.log(
      headLog,
      'Total Entries alive: ' + totalAliveElement,
      STR.reset
    );

    const entriesOnError = elementsDiedReasons.filter(e => e.reason !== 'The debt of the entry was paid');
    if (entriesOnError.length) {
      console.log(
        headLog,
        'Entries on error:', entriesOnError.map(e => e.id),
        STR.reset
      );
    }
  }
};

module.exports = new Claimer();