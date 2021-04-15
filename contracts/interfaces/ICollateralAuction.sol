pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface ICollateralAuction {
    function baseToken() external returns(IERC20);

    function auctions(uint256 _auctionId) external view returns (
        IERC20 fromToken,    // Token that we are intending to sell
        uint64 startTime,    // Start time of the auction
        uint32 limitDelta,   // Limit time until all collateral is offered
        uint256 startOffer,  // Start offer of `fromToken` for the requested `amount`
        uint256 amount,      // Amount that we need to receive of `baseToken`
        uint256 limit        // Limit of how much are willing to spend of `fromToken`
    );

    function getAuctionsLength() external view returns (uint256);
    function take(uint256 _id, bytes calldata _data, bool _callback) external;

    // return How much is being requested and how much is being offered
    function offer(uint256 _auctionId) external view returns (uint256 selling, uint256 requesting);
}
