pragma solidity ^0.6.1;

import "./interfaces/ICollateralAuction.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Router02.sol";

import "./utils/Ownable.sol";


/**
  @author Victor Fage <victorfage@gmail.com>
*/
contract AuctionTakeHelper is Ownable {
	ICollateralAuction public collateralAuction;
	IERC20 public baseToken;

	IUniswapV2Router02 public router;
	address public WETH;

	constructor(ICollateralAuction _collateralAuction, IUniswapV2Router02 _router) public {
		collateralAuction = _collateralAuction;
		baseToken = collateralAuction.baseToken();

		setRouter(_router);
		reApprove();
	}

	function getProfitAmount(uint256 _auctionId) external view returns(uint256) {
		(IERC20 fromToken,,,,,) = collateralAuction.auctions(_auctionId);

		if (fromToken == baseToken)
			return 0;

		(uint256 amountGet, uint256 amountReturn) = collateralAuction.offer(_auctionId);

		address[] memory path = new address[](2);
		uint256[] memory amounts;

		// Calculate amount get in WETH, converting fromToken to WETH
		path[0] = address(fromToken);
		path[1] = WETH;
		amounts = router.getAmountsIn(amountGet, path);
		amountGet = amounts[1];

		// Calculate amount return in WETH, converting WETH to baseToken, to pay the action
		path[0] = WETH;
		path[1] = address(baseToken);
		amounts = router.getAmountsOut(amountReturn, path);
		amountReturn = amounts[0];

		return amountGet >= amountReturn ? amountGet - amountReturn : 0;
	}

	function take(uint256 _auctionId, bytes calldata _data, uint256 _profit) external {
		uint256 prevWethBal = IERC20(WETH).balanceOf(address(this));

		collateralAuction.take(_auctionId, _data, true);

		uint256 expect = prevWethBal + _profit;
		require(expect >= prevWethBal, "take: addition overflow");
		require(IERC20(WETH).balanceOf(address(this)) >= expect, "take: dont get profit");
	}

	function onTake(IERC20 _fromToken, uint256 _amountGet, uint256 _amountReturn) external {
		require(msg.sender == address(collateralAuction), "onTake: The sender should be the collateralAuction");

		if (_fromToken == baseToken)
			return;

		address[] memory path = new address[](2);

		if (address(_fromToken) != WETH) {
			// Converting fromToken to WETH
			path[0] = address(_fromToken);
			path[1] = WETH;

			_fromToken.approve(address(router), _amountGet);

			router.swapExactTokensForTokens(
				_amountGet,
				0,
				path,
				address(this),
				uint(-1)
			);
		}

		// Converting WETH to baseToken, to pay the action
		path[0] = WETH;
		path[1] = address(baseToken);

		router.swapTokensForExactTokens(
			_amountReturn,
			uint(-1),
			path,
			address(this),
			uint(-1)
		);
	}

	fallback() external payable { }

	receive() external payable { }

	function withdrawERC20(IERC20 _token) external onlyOwner {
		require(_token.transfer(_owner, _token.balanceOf(address(this))), "withdraw: error transfer the tokens");
	}

	function withdrawETH() external onlyOwner {
		payable(_owner).transfer(address(this).balance);
	}

	function setRouter(IUniswapV2Router02 _router) public onlyOwner {
		router = _router;
		WETH = router.WETH();
	}

	function reApprove() public onlyOwner {
		baseToken.approve(address(collateralAuction), uint(-1));
	}
}