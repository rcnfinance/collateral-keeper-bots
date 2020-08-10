const { sleepThread, sleep, bytes32, getBlock } = require('../utils.js');
const api = require('../api.js');

module.exports = class Bot {
  constructor() {
    this.totalAliveElement = 0;
  }

  async process() {
    this.lastProcessBlock = await getBlock();

    for (let prevElementLength = 1;;) {
      const elementLength = await this.elementsLength();

      if(elementLength != prevElementLength) {
        for (let i = prevElementLength; i < elementLength; i++)
          this.processElement(i);
      }

      if (elementLength != prevElementLength)
        this.elementsAliveLog();

      api.report('lastProcessBlock', '', this.lastProcessBlock);

      this.lastProcessBlock = await this.waitNewBlock(this.lastProcessBlock);

      prevElementLength = elementLength;
    }
  }

  async processElement(elementId) {
    this.totalAliveElement++;

    const element = await this.createElement(bytes32(elementId));
    await this.reportNewElement(element);

    let resp = await this.isAlive(element);

    while (resp.alive) {
      if (await this.canSendTx(element))
        await this.sendTx(element);

      for ( // Wait for new block
        let lastProcessBlock = this.lastProcessBlock;
        lastProcessBlock.number == this.lastProcessBlock.number;
        await sleepThread()
      );

      resp = await this.isAlive(element);
    }

    if (element)
      element.reason = resp.reason;

    await this.reportEndElement(element);

    this.totalAliveElement--;
  }

  async waitNewBlock(lastCheckBlock) {
    let lastBlock = await getBlock();

    for (; lastCheckBlock.number == lastBlock.number; lastBlock = await getBlock()) {
      await sleep(process.configDefault.AWAIT_GET_BLOCK);
    }

    return lastBlock;
  }

  // Abstract functions

  async elementsLength() {
    throw new Error('Not implement: elementsLength');
  }

  async createElement(elementId) {
    throw new Error('Not implement: createElement');
  }

  async isAlive(element) {
    throw new Error('Not implement: isAlive');
  }

  async canSendTx(element) {
    throw new Error('Not implement: canSendTx');
  }

  async sendTx(element) {
    throw new Error('Not implement: sendTx');
  }

  // Log Abstract functions

  async elementsAliveLog() {
    throw new Error('Not implement: elementsAliveLog');
  }

  // Report Abstract functions

  async reportNewElement(element) {
    throw new Error('Not implement: reportNewElement');
  }

  async reportEndElement(element) {
    throw new Error('Not implement: reportEndElement');
  }

  async reportError(element, funcName, error) {
    throw new Error('Not implement: reportError');
  }
};