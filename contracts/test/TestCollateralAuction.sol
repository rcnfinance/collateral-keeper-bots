pragma solidity ^0.6.1;

import "../interfaces/IERC20.sol";


contract TestCollateralAuction {
    IERC20 public baseToken;
    IERC20 public fromToken;
    uint256 public selling;
    uint256 public requesting;

    constructor(IERC20 _baseToken) public {
        baseToken = _baseToken;
    }

    function auctions(uint256) external view returns (
        IERC20 _fromToken,
        uint64,
        uint32,
        uint256,
        uint256,
        uint256
    ) {
        _fromToken = fromToken;
    }

    function take(
        uint256,
        bytes calldata,
        bool _callback
    ) external {
        require(fromToken.transfer(msg.sender, selling), "take: error sending tokens");

        if (_callback) {
            (bool success, ) = msg.sender.call(abi.encodeWithSignature("onTake(address,uint256,uint256)", fromToken, selling, requesting));
            require(success, "take: error during callback onTake()");
        }

        require(baseToken.transferFrom(msg.sender, address(this), requesting), "take: error pulling tokens");
    }

    function offer(uint256) external view returns (uint256, uint256) {
        return (selling, requesting);
    }

    function setOffer(IERC20 _fromToken, uint256 _selling, uint256 _requesting) external {
        fromToken = _fromToken;
        selling = _selling;
        requesting = _requesting;
    }
}
