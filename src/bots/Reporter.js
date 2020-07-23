const { sleep, bytes32, getBlock, waitNewBlock } = require('../utils.js');
const api = require('../api.js');

const Claimer = require('./Claimer.js');
const Taker = require('./Taker.js');

module.exports = class Reporter {
  constructor() {
    this.claimer = new Claimer();
    this.totalEntriesAlive = 0;

    this.taker = new Taker();
    this.totalAuctionsAlive = 0;
  }

  async process() {
    this.lastProcessBlock = await getBlock();

    let prevEntriesLength = 1;
    let prevAuctionsLength = 1;

    for (;;) {
      const entriesLength = await this.claimer.elementsLength();
      const auctionsLength = await this.taker.elementsLength();

      if (entriesLength != prevEntriesLength) {
        for (let i = prevEntriesLength; i < entriesLength; i++)
          this.report(this.claimer, this.totalEntriesAlive, i);
      }

      if (auctionsLength != prevAuctionsLength) {
        for (let i = prevAuctionsLength; i < auctionsLength; i++)
          this.report(this.taker, this.totalAuctionsAlive, i);
      }

      api.report('Last Process Block', this.lastProcessBlock);

      this.lastProcessBlock = await waitNewBlock(this.lastProcessBlock);

      prevEntriesLength = entriesLength;
      prevAuctionsLength = auctionsLength;
    }
  }

  async report(bot, totalAlive, id) {
    totalAlive++;

    let element;
    let resp;
    try {
      element = await bot.createElement(bytes32(id));

      api.report('New Element', element);

      resp = await bot.isAlive(element);

      while (resp.alive) {
        element.now = this.lastProcessBlock.timestamp.toString();
        await this.reportElement(bot, element);

        // Wait for new block
        for (
          let lastElementProcessBlock = this.lastProcessBlock;
          lastElementProcessBlock.number == this.lastProcessBlock.number;
          await sleep(process.configDefault.AWAIT_THREAD)
        );

        resp = await bot.isAlive(element);
      }
    } catch (error) {
      await api.reportError('#Reporter/reportEntry/Error', id, error);
    }

    if (element)
      api.report('End Element', { element, reason: resp.reason });
    else
      api.report('End Element on Error', { id, reason: resp.alive });

    totalAlive--;
  }

  async reportElement(bot, element) {
    if (bot == this.claimer) {
      await api.report('Claimer Entry', element);
    } else {
      await api.report('Taker Auction', element);
    }
  }
};