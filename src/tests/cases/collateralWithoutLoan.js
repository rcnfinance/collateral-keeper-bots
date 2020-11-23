const Web3 = require('web3');
const WalletManager = require('../../WalletManager.js');
const { pks } = require('../testEnv.js');

async function main() {
  process.environment = require('../../../environment.js');
  process.web3 = new Web3(new Web3.providers.HttpProvider(process.environment.node));
  process.contracts = await require('../../contracts.js')();
  process.walletManager = new WalletManager(pks);

  const testHelper = require('../testHelper.js');
  await testHelper.approveContracts();

  // Create 2 collateral to same loan and lend with one collateral
  const loan = await testHelper.getBasicLoan();

  await testHelper.requestLoan(loan);

  const collateralId = await testHelper.createCollateral(loan);
  await testHelper.createCollateral(loan);

  await testHelper.lendLoan(loan, collateralId);

  // Create 2 collateral to same loan and lend without collateral
  const loan2 = await testHelper.getBasicLoan();

  await testHelper.requestLoan(loan2);

  await testHelper.createCollateral(loan2);
  await testHelper.createCollateral(loan2);

  await testHelper.lendLoan(loan2);
}

main();