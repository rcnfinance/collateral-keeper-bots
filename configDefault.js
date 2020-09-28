const defaultConfig = {
  AWAIT_GET_BLOCK: 15000,
  AWAIT_THREAD: 100,
  // CallManager
  AWAIT_CALL: 1000,
  MAX_CALLS: 50,
  AUCTION_TAKER_PROFIT: '35000000000000000', // 0.035 ETH
};

module.exports = () => {
  const config = {// strings, no require cast
    URL_NODE_ETHEREUM: process.env.URL_NODE_ETHEREUM,
    COLLATERAL_ADDRESS: process.env.COLLATERAL_ADDRESS,
    MULTICALL_ADDRESS: process.env.MULTICALL_ADDRESS,
    AUCTION_TAKER_HELPER: process.env.AUCTION_TAKER_HELPER,
    BOT_PK: process.env.BOT_PK,
    URL_INFLUX: process.env.URL_INFLUX,
  };

  config.TAKE = toBool(process.env.TAKE);
  config.CLAIM = toBool(process.env.CLAIM);
  config.SUBSIDEZE_TAKE = toBool(process.env.SUBSIDEZE_TAKE);

  config.AWAIT_THREAD = toInt(process.env.AWAIT_THREAD, defaultConfig.AWAIT_THREAD);
  config.AWAIT_GET_BLOCK = toInt(process.env.AWAIT_GET_BLOCK, defaultConfig.AWAIT_GET_BLOCK);

  // CallManager
  config.AWAIT_CALL = toInt(process.env.AWAIT_CALL, defaultConfig.AWAIT_CALL);
  config.MAX_CALLS = toInt(process.env.MAX_CALLS, defaultConfig.MAX_CALLS);

  return config;
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