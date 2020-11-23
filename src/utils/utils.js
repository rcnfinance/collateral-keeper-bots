// auctions states
module.exports.STATE = {
  onGoing: 'onGoing',
  error: 'error',
  busy: 'busy',
  finish: 'finish',
};

module.exports.DEBT_STATUS = {
  null: this.bn(0),
  onGoing: this.bn(1),
  paid: this.bn(2),
  destroyed: this.bn(3),
  error: this.bn(4),
};

module.exports.address0x = '0x0000000000000000000000000000000000000000';
module.exports.bytes320x = '0x0000000000000000000000000000000000000000000000000000000000000000';

module.exports.sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports.bn = (number) => {
  return process.w3.utils.toBN(number);
};

module.exports.bytes32 = (number) => {
  return process.w3.utils.toTwosComplement(number);
};

module.exports.getLastBlock = async () => {
  let lastBlock = await process.w3.eth.getBlock(await process.w3.eth.getBlockNumber()); // This can return a null block

  while (lastBlock === null) {
    console.log('Warning: utils.getLastBlock() in utils.js, returns a null last block');
    lastBlock = await process.w3.eth.getBlock(await process.w3.eth.getBlockNumber());
  }
  return lastBlock;
};
