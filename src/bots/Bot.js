const { sleep, STATE, bytes32 } = require('../utils/utils.js');

module.exports = class Bot {
  constructor() {
    this.elements = [];
  }

  async process () {
    for (;;) {
      const elementLength = await this.elementsLength();
      this.elementsLog(elementLength);

      for (let i = 1; i < elementLength; i++) {
        const localElement = this.elements[bytes32(i)];

        if (!localElement) { // Add the element if not exists
          await this.addElement(bytes32(i));
          continue;
        }

        if (localElement.state == STATE.error) {
          if (localElement.errorCount >= 1) {
            localElement.errorCount--;
            continue;
          } else {
            localElement.state = STATE.onGoing;
          }
        }

        if (await this.canSendTx(localElement) && localElement.state === STATE.onGoing) {
          this.sendTx(localElement);
        }
      }

      await sleep(5000);
    }
  }

  async addElement(elementId) {
    const element = await this.createElement(elementId);
    element.state = STATE.onGoing;
    element.waitOnError = 0;
    element.errorCount = 1;

    this.elements[elementId] = element;
  }

  async sendTx(localElement) {
    localElement.state = STATE.busy;

    const tx = await process.walletManager.sendTx(await this.getTx(localElement));

    if (tx instanceof Error){
      localElement.state = STATE.error;
      localElement.waitOnError = (2 * localElement.errorCount) + 1;
      localElement.errorCount++;
    } else {
      localElement.state = STATE.onGoing;
      localElement.errorCount = 1;
    }
  }
};
