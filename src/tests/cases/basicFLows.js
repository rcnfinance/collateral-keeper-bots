const Web3 = require('web3');
const WalletManager = require('../../WalletManager.js');
const { pks } = require('../testEnv.js');
const erc20WithOracleAddress = '0x9ECf08A3eceD837e3b3FB9a35Ac0723D9022DF7b';
const { bn } = require('../../utils.js');
let testHelper;

async function main() {
  process.env = require('../../../environment.js');
  process.web3 = new Web3(new Web3.providers.HttpProvider(process.env.node));
  process.contracts = await require('../../contracts.js')();
  process.walletManager = new WalletManager(pks);

  process.contracts.erc20WithOracle = await new process.web3.eth.Contract(
    require('../../abis/Erc20WithOracleAbi.json'),
    erc20WithOracleAddress
  );

  testHelper = require('../testHelper.js');
  await testHelper.approveContracts();

  //await flow1();
  await flow2();
  //await flow3();
  //await flow4();
  //await flow5();
  await flow6();
}

main();

// 1: Create a collateral
async function flow1() {
  const loan = await testHelper.getBasicLoan();

  await testHelper.requestLoan(loan);

  await testHelper.createCollateral(loan);
}

// 2: Create a collateral
//    Create a request
//    Lent with this collateral
async function flow2() {
  const loan = await testHelper.getBasicLoan();

  await testHelper.requestLoan(loan);

  const collateralId = await testHelper.createCollateral(loan);

  await testHelper.lendLoan(loan, collateralId);
}

// 3: Create a collateral
//    Create a request
//    Lent with one of this n collaterals
async function flow3() {
  const loan = await testHelper.getBasicLoan();

  await testHelper.requestLoan(loan);

  await testHelper.createCollateral(loan);
  const collateralId = await testHelper.createCollateral(loan);
  await testHelper.createCollateral(loan);

  await testHelper.lendLoan(loan, collateralId);
}

// 4: Create a collateral
//    Create a request
//    Lent with this collateral
//    Use borrowCollateral to pay the debt with the collateral balance, we need a handler for this
async function flow4() {
  const loan = await testHelper.getBasicLoan();

  await testHelper.requestLoan(loan);

  const collateralId = await testHelper.createCollateral(loan);

  await testHelper.lendLoan(loan, collateralId);

  // TODO Use borrowCollateral to pay the debt with the collateral balance, we need a handler for this
}

// 5: Create a collateral
//    Create a request
//    Lent with this collateral
//    Wait for expired debt and claim
async function flow5() {
  const loan = await testHelper.getShortLoan();

  await testHelper.requestLoan(loan);

  const collateralId = await testHelper.createCollateral(loan);

  await testHelper.lendLoan(loan, collateralId);
}

// 6: Create a collateral
//    Create a request
//    Lent with this collateral
//    Wait for the collateral ratio goes down and claim
async function flow6() {
  const loan = await testHelper.getBasicLoan();

  await testHelper.requestLoan(loan);

  loan.collateralOracle = process.contracts.erc20WithOracle._address;
  await testHelper.setEquivalent(bn(10000000000000000)); // 1 RCN == 0.01 coll
  loan.entryAmount = bn(50000000000000);

  const collateralId = await testHelper.createCollateral(loan);

  await testHelper.lendLoan(loan, collateralId);

  await testHelper.setEquivalent(bn(1090000000000000000)); // 1 RCN == 1.09 coll
}