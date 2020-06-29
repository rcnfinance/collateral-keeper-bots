module.exports.PAID_DEBT_STATUS = '2';

module.exports.address0x = '0x0000000000000000000000000000000000000000';

module.exports.sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports.bn = (number) => {
  return process.web3.utils.toBN(number);
};

module.exports.bytes32 = (number) => {
  return process.web3.utils.toTwosComplement(number);
};

module.exports.getOracleData = async (oracle) => {
  if (oracle === this.address0x)
    return '0x';

  try {
    process.contracts.rateOracle._address = oracle;
    const oracleUrl = await process.contracts.rateOracle.methods.url().call();

    if (!oracleUrl) // If dont have URL, the oracle data its empty
      return '0x';

    throw new Error('TODO: get oracle data from url and return the oracle data:', oracleUrl);
  } catch (error) {
    console.log('#Utils/getOracleData/Error:', oracle, '\n', error);
  }
};

module.exports.getBlock = async (number = 'latest') => {
  try {
    return await process.web3.eth.getBlock(number);
  } catch (error) {
    console.log('#Utils/getBLock/Error', '\n', error);
  }
};

module.exports.waitNewBlock = async (lastCheckBlock) => {
  let lastBlock = await this.getBlock();

  for (; lastCheckBlock.number == lastBlock.number; lastBlock = await this.getBlock()) {
    await this.sleep(1000);
  }

  return lastBlock;
};