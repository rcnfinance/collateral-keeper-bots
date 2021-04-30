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
    event SetPath(
        address fromToken,
        address _toToken,
        address[] _path
    );

    ICollateralAuction public collateralAuction;
    address public baseToken;

    IUniswapV2Router02 public router;
    address public WETH;

    mapping(bytes32 => address[]) public paths;

    constructor(ICollateralAuction _collateralAuction, IUniswapV2Router02 _router) {
        collateralAuction = _collateralAuction;
        baseToken = _collateralAuction.baseToken();

        setRouter(_router);
        reApprove();
    }

    function setPath(address[] calldata _path) external onlyOwner {
        _setPath(_path);
    }

    function _getSetPath(address _fromToken, address _toToken) internal returns(address[] memory path) {
        path = paths[keccak256(abi.encodePacked(_fromToken, _toToken))];

        if (path.length != 0) {
            _setPath(path);
        }
    }

    function _setPath(address[] memory _path) internal {
        address fromToken = _path[0];
        address toToken = _path[_path.length - 1];
        require(fromToken != toToken, "AuctionTakeHelper: setPath:: IDENTICAL_ADDRESSES");

        paths[keccak256(abi.encodePacked(fromToken, toToken))] = _path;

        emit SetPath(fromToken, toToken, _path);
    }

    function getProfitAmount(uint256 _auctionId) external view returns(uint256) {
        (address fromToken,,,,,) = collateralAuction.auctions(_auctionId);

        if (fromToken == baseToken)
            return 0;

        (uint256 amountGet, uint256 amountReturn) = collateralAuction.offer(_auctionId);

        uint256[] memory amounts;

        if (fromToken != WETH) {
            // Calculate amount get in WETH, converting fromToken to WETH
            amounts = router.getAmountsIn(
                amountGet,
                paths[keccak256(abi.encodePacked(fromToken, WETH))]
            );
            amountGet = amounts[1];
        }

        // Calculate amount return in WETH, converting WETH to baseToken, to pay the auction
        amounts = router.getAmountsOut(
            amountReturn,
            paths[keccak256(abi.encodePacked(WETH, baseToken))]
        );
        amountReturn = amounts[0];

        return amountGet >= amountReturn ? amountGet - amountReturn : 0;
    }

    function take(
        uint256 _auctionId,
        bytes calldata _data,
        uint256 _profit
    ) external {
        collateralAuction.take(_auctionId, _data, true);

        uint256 wethBal = IERC20(WETH).balanceOf(address(this));
        require(wethBal >= _profit, "AuctionTakeHelper: take:: dont get profit");

        if (wethBal != 0) {
            WETH9(payable(WETH)).withdraw(wethBal);
            payable(owner()).transfer(wethBal);
        }
    }

    // Collateral auction callback
    function onTake(
        address _fromToken,
        uint256 _amountGet,
        uint256 _amountReturn
    ) external {
        require(msg.sender == address(collateralAuction), "AuctionTakeHelper: onTake:: The sender should be the collateralAuction");

        if (_fromToken == baseToken)
            return;

        if (_fromToken != WETH) {
            IERC20(_fromToken).approve(address(router), _amountGet);

            // Converting fromToken to WETH
            uint256[] memory amounts = router.swapExactTokensForTokens({
                amountIn:     _amountGet,
                amountOutMin: 0,
                path:         _getSetPath(_fromToken, WETH),
                to:           address(this),
                deadline:     type(uint256).max
            });
            _amountGet = amounts[1];
        }

        // Converting WETH to baseToken, to pay the auction
        router.swapTokensForExactTokens({
            amountOut:   _amountReturn,
            amountInMax: _amountGet,
            path:        _getSetPath(WETH, baseToken),
            to:          address(this),
            deadline:    type(uint256).max
        });
    }

    fallback() external payable { }

    receive() external payable { }

    function withdrawERC20(IERC20 _token) external onlyOwner {
        _token.transfer(owner(), _token.balanceOf(address(this)));
    }

    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function setRouter(IUniswapV2Router02 _router) public onlyOwner {
        router = _router;
        WETH = _router.WETH();
    }

    function reApprove() public {
        IERC20(WETH).approve(address(router), type(uint256).max);
        IERC20(baseToken).approve(address(collateralAuction), type(uint256).max);
    }
}
