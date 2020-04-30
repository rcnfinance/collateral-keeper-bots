const Web3 = require('web3');
const WalletManager = require('../../WalletManager.js');
const { pks } = require('../testEnv.js');

// Create ten loans, create 10 collaterals for this loans and lend
async function main() {
  process.env = require('../../../environment.js');
  process.web3 = new Web3(new Web3.providers.HttpProvider(process.env.node));
  process.contracts = await require('../../contracts.js')();
  process.walletManager = new WalletManager(pks);

  const testHelper = require('../testHelper.js');
  await testHelper.approveContracts();

  for(let i = 0; i < 1; i++){
    const loan = await testHelper.getBasicLoan();

    await testHelper.requestLoan(loan);

    const collateralId = await testHelper.createCollateral(loan);

    await testHelper.lendLoan(loan, collateralId);
  }
}

main();