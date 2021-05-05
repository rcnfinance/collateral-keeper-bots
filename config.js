const defaultConfig = {
  AWAIT_GET_BLOCK: 15000,
  AWAIT_THREAD: 100,
  // CallManager
  AWAIT_CALL: 1000,
  MAX_CALLS: 50,
  AUCTION_TAKER_PROFIT: '35', // 0.035 ETH
};

module.exports = {
  // strings, no require cast
  URL_NODE: process.env.URL_NODE,
  COLLATERAL_ADDRESS: process.env.COLLATERAL_ADDRESS,
  MULTICALL_ADDRESS: process.env.MULTICALL_ADDRESS,
  AUCTION_TAKER_HELPER: process.env.AUCTION_TAKER_HELPER,
  BOT_PK: process.env.BOT_PK,

  TAKE: toBool(process.env.TAKE),
  CLAIM: toBool(process.env.CLAIM),
  SUBSIDEZE_TAKE_IN_BASETOKEN: toBool(process.env.SUBSIDEZE_TAKE_IN_BASETOKEN),
  SUBSIDEZE_TX_TAKE: toBool(process.env.SUBSIDEZE_TX_TAKE),
  AUCTION_TAKER_PROFIT: toInt(process.env.AUCTION_TAKER_PROFIT, defaultConfig.AUCTION_TAKER_PROFIT),

  AWAIT_GET_ELEMENTS: toInt(process.env.AWAIT_GET_ELEMENTS, defaultConfig.AWAIT_GET_ELEMENTS),
  AWAIT_THREAD: toInt(process.env.AWAIT_THREAD, defaultConfig.AWAIT_THREAD),
  AWAIT_GET_BLOCK: toInt(process.env.AWAIT_GET_BLOCK, defaultConfig.AWAIT_GET_BLOCK),

  // CallManager
  AWAIT_CALL: toInt(process.env.AWAIT_CALL, defaultConfig.AWAIT_CALL),
  MAX_CALLS: toInt(process.env.MAX_CALLS, defaultConfig.MAX_CALLS),
};

function toBool(str, defaultValue) {
  if (!str && defaultValue)
    return defaultValue;
  else
    return str === 'true';
}

function toInt(str, defaultValue) {
  return str ? parseInt(str) : defaultValue;
}
