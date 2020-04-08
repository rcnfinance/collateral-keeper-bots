module.exports = async () => {
  const contracts = {};

  contracts.collateral = await new process.w3.eth.Contract(
    require('./abis/collateralAbi.json'),
    process.env.collateralAddress
  );

  const auctionAddress = await contracts.collateral.methods.auction().call();
  contracts.auction = await new process.w3.eth.Contract(
    require('./abis/collateralAuctionAbi.json'),
    auctionAddress
  );

  const loanManagerAddress = await contracts.collateral.methods.loanManager().call();
  contracts.loanManager = await new process.w3.eth.Contract(
    require('./abis/loanManagerAbi.json'),
    loanManagerAddress
  );

  const debtEngineAddress = await contracts.loanManager.methods.debtEngine().call();
  contracts.debtEngine = await new process.w3.eth.Contract(
    require('./abis/debtEngineAbi.json'),
    debtEngineAddress
  );

  const baseTokenAddress = await contracts.debtEngine.methods.token().call();
  contracts.baseToken = await new process.w3.eth.Contract(
    require('./abis/ERC20Abi.json'),
    baseTokenAddress
  );

  contracts.model = await new process.w3.eth.Contract(require('./abis/ModelAbi.json'));
  contracts.installmentsModel = await new process.w3.eth.Contract(require('./abis/InstallmentsModelAbi.json'));
  contracts.multiSourceOracle = await new process.w3.eth.Contract(require('./abis/MultiSourceOracleAbi.json'));
  contracts.rateOracle = await new process.w3.eth.Contract(require('./abis/RateOracleAbi.json'));

  return contracts;
};