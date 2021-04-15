pragma solidity ^0.8.0;

import "./interfaces/ICollateralAuction.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./test/WETH9.sol";
import "./interfaces/IUniswapV2Router02.sol";

import "@openzeppelin/contracts/access/Ownable.sol";


/**
  @author Victor Fage <victorfage@gmail.com>
*/
contract AuctionTakeHelper is Ownable {
    ICollateralAuction public collateralAuction;
    IERC20 public baseToken;

    IUniswapV2Router02 public router;
    IERC20 public WETH;

    constructor(ICollateralAuction _collateralAuction, IUniswapV2Router02 _router) {
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

        if (fromToken != WETH) {
            // Calculate amount get in WETH, converting fromToken to WETH
            path[0] = address(fromToken);
            path[1] = address(WETH);
            amounts = router.getAmountsIn(amountGet, path);
            amountGet = amounts[1];
        }

        // Calculate amount return in WETH, converting WETH to baseToken, to pay the auction
        path[0] = address(WETH);
        path[1] = address(baseToken);
        amounts = router.getAmountsOut(amountReturn, path);
        amountReturn = amounts[0];

        return amountGet >= amountReturn ? amountGet - amountReturn : 0;
    }

    function take(uint256 _auctionId, bytes calldata _data, uint256 _profit) external {
        collateralAuction.take(_auctionId, _data, true);

        uint256 wethBal = WETH.balanceOf(address(this));
        require(wethBal >= _profit, "take: dont get profit");

        if (wethBal != 0) {
            WETH9(payable(address(WETH))).withdraw(wethBal);
            payable(owner()).transfer(wethBal);
        }
    }

    function onTake(IERC20 _fromToken, uint256 _amountGet, uint256 _amountReturn) external {
        require(msg.sender == address(collateralAuction), "onTake: The sender should be the collateralAuction");

        if (_fromToken == baseToken)
            return;

        address[] memory path = new address[](2);

        if (_fromToken != WETH) {
            _fromToken.approve(address(router), _amountGet);

            // Converting fromToken to WETH
            path[0] = address(_fromToken);
            path[1] = address(WETH);
            uint256[] memory amounts = router.swapExactTokensForTokens({
                amountIn:     _amountGet,
                amountOutMin: 0,
                path:         path,
                to:           address(this),
                deadline:     type(uint256).max
            });
            _amountGet = amounts[1];
        }

        // Converting WETH to baseToken, to pay the auction
        path[0] = address(WETH);
        path[1] = address(baseToken);
        router.swapTokensForExactTokens({
            amountOut:   _amountReturn,
            amountInMax: _amountGet,
            path:        path,
            to:          address(this),
            deadline:    type(uint256).max
        });
    }

    fallback() external payable { }

    receive() external payable { }

    function withdrawERC20(IERC20 _token) external onlyOwner {
        require(_token.transfer(owner(), _token.balanceOf(address(this))), "withdraw: error transfer the tokens");
    }

    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function setRouter(IUniswapV2Router02 _router) public onlyOwner {
        router = _router;
        WETH = IERC20(router.WETH());
    }

    function reApprove() public onlyOwner {
        WETH.approve(address(router), type(uint256).max);
        baseToken.approve(address(collateralAuction), type(uint256).max);
    }
}