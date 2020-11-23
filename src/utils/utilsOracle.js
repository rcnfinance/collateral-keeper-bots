const { bn, address0x } = require('./utils.js');

module.exports.toBaseToken = async (oracle, amount) => {
  if (oracle === address0x) // Debt in loanManagerToken
    return amount;

  process.contracts.rateOracle._address = oracle;
  const sample = await process.contracts.rateOracle.methods.readSample(await this.getOracleData(oracle)).call();

  return amount.mul(bn(sample._tokens)).div(bn(sample._equivalent));
};

module.exports.getOracleData = async (oracle) => {
  process.contracts.rateOracle._address = oracle;

  let oracleUrl;
  try {
    oracleUrl = await process.contracts.rateOracle.methods.url().call();
  } catch (error) {
    return '0x';
  }

  if (oracleUrl === null) // If dont have URL, the oracle data its empty
    return '0x';

  throw new Error('TODO: get oracle data from url and return the oracle data');
};
