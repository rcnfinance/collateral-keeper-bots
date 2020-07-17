module.exports = async () => {
  const contracts = {};

  contracts.multicall = await new process.web3.eth.Contract(
    require('./abis/multicallAbi.json'),
    process.configDefault.MULTICALL_ADDRESS
  );

  contracts.collateral = await new process.web3.eth.Contract(
    require('./abis/collateralAbi.json'),
    process.configDefault.COLLATERAL_ADDRESS
  );

  try {
    const auctionAddress = await contracts.collateral.methods.auction().call();
    contracts.auction = await new process.web3.eth.Contract(
      require('./abis/collateralAuctionAbi.json'),
      auctionAddress
    );

    const loanManagerAddress = await contracts.collateral.methods.loanManager().call();
    contracts.loanManager = await new process.web3.eth.Contract(
      require('./abis/loanManagerAbi.json'),
      loanManagerAddress
    );

    const debtEngineAddress = await contracts.loanManager.methods.debtEngine().call();
    contracts.debtEngine = await new process.web3.eth.Contract(
      require('./abis/debtEngineAbi.json'),
      debtEngineAddress
    );

    const baseTokenAddress = await contracts.debtEngine.methods.token().call();
    contracts.baseToken = await new process.web3.eth.Contract(
      require('./abis/erc20Abi.json'),
      baseTokenAddress
    );
  } catch (error) {
    console.log('Init contratcs Error:\n', error);
    throw new Error(error);
  }

  contracts.rateOracle = await new process.web3.eth.Contract(require('./abis/RateOracleAbi.json'));

  contracts.erc20 = await new process.web3.eth.Contract(require('./abis/erc20Abi.json'));

  return contracts;
};
