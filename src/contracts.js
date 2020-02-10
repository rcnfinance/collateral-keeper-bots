const axios = require('axios');

module.exports = async () => {
  const contracts = {};

  contracts.collateral = await new process.w3.eth.Contract(
    await getAbi(process.env.collateralAddress),
    process.env.collateralAddress
  );

  const auctionAddress = await contracts.collateral.methods.auction().call();
  contracts.auction = await new process.w3.eth.Contract(
    await getAbi(auctionAddress),
    auctionAddress
  );

  const loanManagerAddress = await contracts.collateral.methods.loanManager().call();
  contracts.loanManager = await new process.w3.eth.Contract(
    await getAbi(loanManagerAddress),
    loanManagerAddress
  );

  const debtEngineAddress = await contracts.loanManager.methods.debtEngine().call();
  contracts.debtEngine = await new process.w3.eth.Contract(
    await getAbi(debtEngineAddress),
    debtEngineAddress
  );

  const baseTokenAddress = await contracts.debtEngine.methods.token().call();
  contracts.baseToken = await new process.w3.eth.Contract(
    await getAbi(baseTokenAddress),
    baseTokenAddress
  );

  contracts.model = await new process.w3.eth.Contract(require('./abis/ModelAbi.json'));
  contracts.installmentsModel = await new process.w3.eth.Contract(require('./abis/InstallmentsModelAbi.json'));
  contracts.multiSourceOracle = await new process.w3.eth.Contract(require('./abis/MultiSourceOracleAbi.json'));
  contracts.rateOracle = await new process.w3.eth.Contract(require('./abis/RateOracleAbi.json'));

  return contracts;
};

async function getAbi(address) {
  const urlBase = 'https://api-ropsten.etherscan.io/api?module=contract&action=getabi&address=';
  const url = urlBase + address;

  try {
    const response = await axios.get(url);
    return JSON.parse(response.data.result);
  } catch (error) {
    console.log(error);
    return error;
  }
}
