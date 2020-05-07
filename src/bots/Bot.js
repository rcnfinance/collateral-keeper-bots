const { sleep, bytes32 } = require('../utils.js');

module.exports = class Bot {
  constructor() {
    this.totalAliveElement = 0;
  }

  async process () {
    for (let prevElementLength = 1;;) {
      const elementLength = await this.elementsLength();

      if(elementLength != prevElementLength) {
        for (let i = prevElementLength; i < elementLength; i++)
          this.processElement(i);
      }

      this.elementsAliveLog();

      await sleep(25000);
      prevElementLength = elementLength;
    }
  }

  async processElement(elementId) {
    this.totalAliveElement++;

    try {
      const element = await this.createElement(bytes32(elementId));

      while (await this.isAlive(element)) {
        if (await this.canSendTx(element))
          await this.sendTx(element);

        await sleep(5000);
      }
    } catch (error) {
      console.log('#Bot/processElement/Error:\n', error);
    }

    this.totalAliveElement--;
  }
};
