module.exports = {
  BOT_PKS: process.env.BOT_PKS,
  URL_NODE_ETHEREUM: process.env.URL_NODE_ETHEREUM,
  COLLATERAL_ADDRESS: process.env.COLLATERAL_ADDRESS,
  MULTICALL_ADDRESS: process.env.MULTICALL_ADDRESS,
  // Optional
  TAKE: process.env.TAKE,
  CLAIM: process.env.CLAIM,
  REPORTER: process.env.REPORTER,
  URL_INFLUX: process.env.URL_INFLUX,
  CALL_MANAGER : {
    AWAIT_CALL: process.env.AWAIT_CALL || 100,
    AWAIT_RESPONSE: process.env.AWAIT_RESPONSE || 100,
    MAX_CALLS: process.env.MAX_CALLS || 25,
  }
};