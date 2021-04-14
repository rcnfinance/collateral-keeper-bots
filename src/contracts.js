module.exports = async () => {
  const contracts = {};

  contracts.multicall = await new process.web3.eth.Contract(
    require('./abis/Multicall.json'),
    process.configDefault.MULTICALL_ADDRESS
  );

  contracts.auctionTakeHelper = await new process.web3.eth.Contract(
    require('./abis/AuctionTakeHelper.json'),
    process.configDefault.AUCTION_TAKER_HELPER
  );

  contracts.collateral = await new process.web3.eth.Contract(
    require('./abis/Collateral.json'),
    process.configDefault.COLLATERAL_ADDRESS
  );

  const auctionAddress = await contracts.collateral.methods.auction().call();
  contracts.auction = await new process.web3.eth.Contract(
    require('./abis/CollateralAuction.json'),
    auctionAddress
  );

  const loanManagerAddress = await contracts.collateral.methods.loanManager().call();
  contracts.loanManager = await new process.web3.eth.Contract(
    require('./abis/LoanManager.json'),
    loanManagerAddress
  );

  const debtEngineAddress = await contracts.loanManager.methods.debtEngine().call();
  contracts.debtEngine = await new process.web3.eth.Contract(
    require('./abis/DebtEngine.json'),
    debtEngineAddress
  );

  const baseTokenAddress = await contracts.debtEngine.methods.token().call();
  contracts.baseToken = await new process.web3.eth.Contract(
    require('./abis/ERC20.json'),
    baseTokenAddress
  );

  contracts.rateOracle = await new process.web3.eth.Contract(require('./abis/RateOracle.json'));

  return contracts;
};
