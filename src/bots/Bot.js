const config = require('../../config.js');
const { sleepThread, sleep, bytes32, getBlock } = require('../utils.js');

module.exports = class Bot {
  constructor() {
    this.totalAliveElement = 0;
    this.elementsDiedReasons = [];
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

      this.lastProcessBlock = await this.waitNewBlock(this.lastProcessBlock);

      prevElementLength = elementLength;
    }
  }

  async processElement(elementId) {
    this.totalAliveElement++;

    const element = await this.createElement(bytes32(elementId));

    await this.isAlive(element);

    while (!element.diedReason) {
      if (await this.canSendTx(element))
        await this.sendTx(element);

      for ( // Wait for new block
        let lastProcessBlock = this.lastProcessBlock;
        lastProcessBlock.number == this.lastProcessBlock.number;
        await sleepThread()
      );

      await this.isAlive(element);
    }

    this.elementsDiedReasons.push({ id: element.id, reason: element.diedReason });

    this.totalAliveElement--;
  }

  async waitNewBlock(lastCheckBlock) {
    for (let lastBlock; ; await sleep(config.AWAIT_GET_BLOCK)) {
      lastBlock = await getBlock();

      if (lastCheckBlock.number != lastBlock.number)
        return lastBlock;
    }
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
};
