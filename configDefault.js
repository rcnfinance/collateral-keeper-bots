const defaultConfig = {
  AWAIT_THREAD: 200,
  AWAIT_GET_BLOCK: 15000,
  // CallManager
  AWAIT_CALL: 1000,
  MAX_CALLS: 50,
};

module.exports = () => {
  const config = {// strings, no require cast
    BOT_PKS: process.env.BOT_PKS,
    URL_NODE_ETHEREUM: process.env.URL_NODE_ETHEREUM,
    COLLATERAL_ADDRESS: process.env.COLLATERAL_ADDRESS,
    MULTICALL_ADDRESS: process.env.MULTICALL_ADDRESS,
    URL_INFLUX: process.env.URL_INFLUX,
  };

  config.TAKE = toBool(process.env.TAKE);
  config.CLAIM = toBool(process.env.CLAIM);

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