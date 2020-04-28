const Web3 = require('web3');
const WalletManager = require('../../WalletManager.js');
const { pks } = require('../testEnv.js');


// Create a collateral and cancel
async function main() {
  process.env = require('../../../environment.js');
  process.web3 = new Web3(new Web3.providers.HttpProvider(process.env.node));
  process.contracts = await require('../../contracts.js')();
  process.walletManager = new WalletManager(pks);

  const testHelper = require('../testHelper.js');
  await testHelper.approveContracts();

  const loan = await testHelper.getBasicLoan();

  await testHelper.requestLoan(loan);

  const collateralId = await testHelper.createCollateral(loan);

  await testHelper.cancelCollateral(loan, collateralId);
}

main();
