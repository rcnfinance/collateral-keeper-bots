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
  let oracleUrl;
  try {
    process.contracts.rateOracle._address = oracle;
    oracleUrl = await process.contracts.rateOracle.methods.url().call();
  } catch (error) {
    oracleUrl = null;
  }

  if (oracleUrl === null) // If dont have URL, the oracle data its empty
    return '0x';

  throw new Error('TODO: get oracle data from url and return the oracle data');
};