pragma solidity ^0.6.1;

import "../interfaces/IERC20.sol";


interface Taker{
    function onTake(address, uint256, uint256) external;
}


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
            Taker(msg.sender).onTake(address(fromToken), selling, requesting);
        }

        require(baseToken.transferFrom(msg.sender, address(this), requesting), "take: error pulling tokens");
    }

    function offer(uint256) external view returns (uint256, uint256) {
        return (selling, requesting);
    }

    function setSelling(IERC20 _fromToken, uint256 _selling) external {
        fromToken = _fromToken;
        selling = _selling;
    }

    function setRequesting(uint256 _requesting) external {
        requesting = _requesting;
    }
}
