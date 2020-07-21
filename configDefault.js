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
  AWAIT_THREAD: process.env.AWAIT_THREAD || 200,
  AWAIT_GET_BLOCK: process.env.AWAIT_GET_BLOCK || 15000,
  CALL_MANAGER : {
    AWAIT_CALL: process.env.AWAIT_CALL || 1000,
    MAX_CALLS: process.env.MAX_CALLS || 50,
  }
};