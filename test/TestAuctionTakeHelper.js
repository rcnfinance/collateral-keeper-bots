const TestToken = artifacts.require('TestToken');
const WETH9 = artifacts.require('WETH9');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Router = artifacts.require('UniswapV2Router02');
const TestCollateralAuction = artifacts.require('TestCollateralAuction');

const AuctionTakeHelper = artifacts.require('AuctionTakeHelper');

const { assert } = require('chai');
const {
  expect,
  bn,
  address0x,
  tryCatchRevert,
  toETH,
} = require('./Helper.js');

contract('Test AuctionTakeHelper', function (accounts) {
  const owner = accounts[1];
  const notOwner = accounts[9];

  let baseToken;
  let testToken;
  let weth;
  let uniswapV2Factory;
  let router;
  let auction;

  let takeHelper;

  async function addLiquidity (tokenA, tokenB, amountA, amountB) {
    await tokenA.setBalance(owner, amountA);
    await tokenA.approve(router.address, amountA, { from: owner });
    await tokenB.setBalance(owner, amountB);
    await tokenB.approve(router.address, amountB, { from: owner });

    await router.addLiquidity(
      tokenA.address,
      tokenB.address,
      amountA,
      amountB,
      1,
      1,
      owner,
      bn('999999999999999999999999999999'),
      { from: owner }
    );
  }

  async function addLiquidityETH (tokenA, amountETH, amountA) {
    await tokenA.setBalance(owner, amountA);
    await tokenA.approve(router.address, amountA, { from: owner });

    await router.addLiquidityETH(
      tokenA.address,
      amountA,
      1,
      1,
      owner,
      '9999999999999999999999999999999',
      { from: owner, value: amountETH }
    );
  }

  before('Create contracts', async function () {
    // Deploy Tokens
    baseToken = await TestToken.new();
    testToken = await TestToken.new();
    weth = await WETH9.new();

    // Collateral auction mock
    auction = await TestCollateralAuction.new(baseToken.address);

    await baseToken.setBalance(auction.address, toETH(1));
    await testToken.setBalance(auction.address, toETH(1));
    await weth.deposit({ from: owner, value: toETH(1) });
    await weth.transfer(auction.address, toETH(1), { from: owner });
  });
  beforeEach(async function () {
    // Deploy Uniswap V2
    uniswapV2Factory = await UniswapV2Factory.new(owner);
    router = await UniswapV2Router.new(uniswapV2Factory.address, weth.address);

    // Add liquidity
    await addLiquidity(testToken, baseToken, toETH(1), toETH(1));
    await addLiquidityETH(baseToken, toETH(1), toETH(1));
    await addLiquidityETH(testToken, toETH(1), toETH(1));

    takeHelper = await AuctionTakeHelper.new(auction.address, router.address, { from: owner });

    await takeHelper.setPath([testToken.address, weth.address], { from: owner });
    await takeHelper.setPath([weth.address, baseToken.address], { from: owner });
  });

  it('Check constructor', async function () {
    const _auctionTakeHelper = await AuctionTakeHelper.new(auction.address, router.address, { from: owner });

    assert.equal(await _auctionTakeHelper.router(), router.address);
    assert.equal(await _auctionTakeHelper.WETH(), await router.WETH());

    assert.equal(await _auctionTakeHelper.collateralAuction(), auction.address);
    assert.equal(await _auctionTakeHelper.baseToken(), await auction.baseToken());

    const maxUint = bn(2).pow(bn(256)).sub(bn(1));
    expect(await baseToken.allowance(_auctionTakeHelper.address, auction.address)).to.eq.BN(maxUint);
  });
  it('Function reApprove', async function () {
    await takeHelper.reApprove({ from: owner });

    const maxUint = bn(2).pow(bn(256)).sub(bn(1));
    expect(await baseToken.allowance(takeHelper.address, auction.address)).to.eq.BN(maxUint);
  });
  it('Function withdrawERC20', async function () {
    const prevBal = await testToken.balanceOf(owner);
    const takeHelperBal = await testToken.balanceOf(takeHelper.address);

    await takeHelper.withdrawERC20(testToken.address, { from: owner });

    expect(await testToken.balanceOf(owner)).to.eq.BN(prevBal.add(takeHelperBal));
    expect(await testToken.balanceOf(takeHelper.address)).to.eq.BN(0);
  });
  it('Function setRouter', async function () {
    const _router = await UniswapV2Router.new(uniswapV2Factory.address, weth.address);

    await takeHelper.setRouter(_router.address, { from: owner });

    assert.equal(await takeHelper.router(), _router.address);
    assert.equal(await takeHelper.WETH(), await _router.WETH());
  });
  describe('Functions onlyOwner', async function () {
    it('Try withdraw ERC20 token without being the owner', async function () {
      await tryCatchRevert(
        () => takeHelper.withdrawERC20(
          testToken.address,
          { from: notOwner }
        ),
        'Ownable: caller is not the owner'
      );
    });
    it('Try withdraw ETH without being the owner', async function () {
      await tryCatchRevert(
        () => takeHelper.withdrawETH(
          { from: notOwner }
        ),
        'Ownable: caller is not the owner'
      );
    });
    it('Try set a router without being the owner', async function () {
      await tryCatchRevert(
        () => takeHelper.setRouter(
          address0x,
          { from: notOwner }
        ),
        'Ownable: caller is not the owner'
      );
    });
  });
  describe('Function getProfitAmount', function () {
    it('Should return 0 if the from token is base token', async function () {
      auction.setSelling(baseToken.address, 1);
      auction.setRequesting(1);
      expect(await takeHelper.getProfitAmount(0)).to.eq.BN(0);
    });
    it('Should not get profit', async function () {
      auction.setSelling(testToken.address, 1000);
      auction.setRequesting(1000);
      expect(await takeHelper.getProfitAmount(0)).to.eq.BN(0);

      auction.setSelling(testToken.address, 1000);
      auction.setRequesting(2000);
      expect(await takeHelper.getProfitAmount(0)).to.eq.BN(0);
    });
    it('Should get profit', async function () {
      auction.setSelling(testToken.address, 2000);
      auction.setRequesting(1000);
      expect(await takeHelper.getProfitAmount(0)).to.eq.BN(1000);
    });
    it('Should not get profit in weth', async function () {
      auction.setSelling(weth.address, 1000);
      auction.setRequesting(1000);
      expect(await takeHelper.getProfitAmount(0)).to.eq.BN(0);

      auction.setSelling(weth.address, 1000);
      auction.setRequesting(2000);
      expect(await takeHelper.getProfitAmount(0)).to.eq.BN(0);
    });
    it('Should get profit in weth', async function () {
      auction.setSelling(weth.address, 2000);
      auction.setRequesting(1000);
      expect(await takeHelper.getProfitAmount(0)).to.eq.BN(1000);
    });
  });
  describe('Wins function take', function () {
    it('Should take the auction withour setPath', async function () {
      const takeHelper2 = await AuctionTakeHelper.new(auction.address, router.address, { from: owner });

      const prevBal = await web3.eth.getBalance(owner);

      auction.setSelling(testToken.address, 102);
      auction.setRequesting(100);
      await takeHelper2.take(0, [], 0);

      expect(await testToken.balanceOf(takeHelper2.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(takeHelper2.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(owner)).to.eq.BN(prevBal);
    });
    it('Should take the auction in base token', async function () {
      auction.setSelling(baseToken.address, 0);
      auction.setRequesting(0);
      await takeHelper.take(0, [], 0);

      auction.setSelling(baseToken.address, 1);
      auction.setRequesting(1);
      await takeHelper.take(0, [], 0);
    });
    it('Should take the auction in weth token', async function () {
      const prevBal = await web3.eth.getBalance(owner);

      auction.setSelling(weth.address, 101);
      auction.setRequesting(100);
      await takeHelper.take(0, [], 0);

      expect(await weth.balanceOf(takeHelper.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(takeHelper.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(owner)).to.eq.BN(prevBal);
    });
    it('Should take the auction in weth token', async function () {
      const prevBal = bn(await web3.eth.getBalance(owner));

      auction.setSelling(weth.address, 1000);
      auction.setRequesting(100);
      await takeHelper.take(0, [], 0);

      expect(await weth.balanceOf(takeHelper.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(takeHelper.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(owner)).to.eq.BN(prevBal.add(bn(899)));
    });
    it('Should take the auction in test token', async function () {
      const prevBal = await web3.eth.getBalance(owner);

      auction.setSelling(testToken.address, 102);
      auction.setRequesting(100);
      await takeHelper.take(0, [], 0);

      expect(await testToken.balanceOf(takeHelper.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(takeHelper.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(owner)).to.eq.BN(prevBal);
    });
    it('Should take the auction in test token', async function () {
      const prevBal = bn(await web3.eth.getBalance(owner));

      auction.setSelling(testToken.address, 1000);
      auction.setRequesting(100);
      await takeHelper.take(0, [], 0);

      expect(await testToken.balanceOf(takeHelper.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(takeHelper.address)).to.eq.BN(0);
      expect(await web3.eth.getBalance(owner)).to.eq.BN(prevBal.add(bn(895)));
    });
  });
  describe('Fails function take', function () {
    it('Try hack', async function () {
      await tryCatchRevert(
        () => takeHelper.onTake(
          address0x,
          0,
          0,
          { from: owner }
        ),
        'AuctionTakeHelper: onTake:: The sender should be the collateralAuction'
      );
    });
    it('1) Try take a auction and dont get profit in base token', async function () {
      auction.setSelling(baseToken.address, 0);
      auction.setRequesting(0);
      await tryCatchRevert(
        () => takeHelper.take(0, [], 1, { from: owner }),
        'AuctionTakeHelper: take:: dont get profit'
      );
    });
    it('2) Try take a auction and dont get profit in base token', async function () {
      auction.setSelling(baseToken.address, 1);
      auction.setRequesting(1);

      await tryCatchRevert(
        () => takeHelper.take(0, [], 1, { from: owner }),
        'AuctionTakeHelper: take:: dont get profit'
      );
    });
    it('Try take a auction and dont get profit in weth token', async function () {
      auction.setSelling(weth.address, 2);
      auction.setRequesting(1);

      await tryCatchRevert(
        () => takeHelper.take(0, [], 1, { from: owner }),
        'AuctionTakeHelper: take:: dont get profit'
      );
    });
    it('1) Try take a auction and dont get profit in test token', async function () {
      auction.setSelling(testToken.address, 3);
      auction.setRequesting(1);

      await tryCatchRevert(
        () => takeHelper.take(0, [], 1, { from: owner }),
        'AuctionTakeHelper: take:: dont get profit'
      );
    });
  });
});
