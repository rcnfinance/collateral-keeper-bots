module.exports = async () => {
  const contracts = {};

  contracts.collateral = await new process.web3.eth.Contract(
    require('./abis/collateralAbi.json'),
    process.env.collateralAddress
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
    console.log('Init contratcs Error:\n', error.message);
    throw new Error(error);
  }

  contracts.uniswapOracle = await new process.web3.eth.Contract(
    require('./abis/uniswapOracleABI.json'),
    '0x01a65a0f19eC127D0DB1Bb83aBcA2B8B0Bef2669'
  );

  contracts.model = await new process.web3.eth.Contract(
    require('./abis/ModelAbi.json'),
    '0x41e9D0B6a8Ce88989c2e7b3CaE42ECFAc44c9603'
  );

  contracts.rateOracle = await new process.web3.eth.Contract(require('./abis/RateOracleAbi.json'));

  contracts.erc20 = await new process.web3.eth.Contract(require('./abis/erc20Abi.json'));

  return contracts;
};
