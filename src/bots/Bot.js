const { sleep, bytes32, getBlock, waitNewBlock } = require('../utils.js');
const api = require('../api.js');

module.exports = class Bot {
  constructor() {
    this.totalAliveElement = 0;
  }

  async process () {
    this.lastProcessBlock = await getBlock();

    for (let prevElementLength = 1;;) {
      const elementLength = await this.elementsLength();

      if(elementLength != prevElementLength) {
        for (let i = prevElementLength; i < elementLength; i++)
          this.processElement(i);
      }

      if (elementLength != prevElementLength)
        this.elementsAliveLog();

      api.report('Last Process Block', this.lastProcessBlock);

      this.lastProcessBlock = await waitNewBlock(this.lastProcessBlock);

      await sleep(5000);

      prevElementLength = elementLength;
    }
  }

  async processElement(elementId) {
    this.totalAliveElement++;

    let element;
    let resp;
    try {
      element = await this.createElement(bytes32(elementId));
      api.report('New Element', element);

      resp = await this.isAlive(element);

      while (resp.alive) {
        if (await this.canSendTx(element))
          await this.sendTx(element);

        for ( // Wait for new block
          let lastElementProcessBlock = this.lastProcessBlock;
          lastElementProcessBlock.number == this.lastProcessBlock.number;
          await sleep(1000)
        );

        resp = await this.isAlive(element);
      }
    } catch (error) {
      await api.reportError('#Bot/processElement/Error', elementId, error);
    }

    if (element)
      api.report('End Element', { element, reason: resp.reason });
    else
      api.report('End Element on Error', { elementId, reason: resp.alive });

    this.totalAliveElement--;
  }

  // Abstract functions

  async elementsLength(){
    throw new Error('Not implement: elementsLength');
  }

  async createElement(elementId){
    throw new Error('Not implement: createElement');
  }

  async isAlive(element){
    throw new Error('Not implement: isAlive');
  }

  async canSendTx(element){
    throw new Error('Not implement: canSendTx');
  }

  async sendTx(element){
    throw new Error('Not implement: sendTx');
  }

  // Log Abstract functions

  async elementsAliveLog(){
    throw new Error('Not implement: elementsAliveLog');
  }
};