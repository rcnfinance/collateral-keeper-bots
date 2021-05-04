const config = require('./config.js');
const claimer = require('./src/bots/Claimer.js');
const taker = require('./src/bots/Taker.js');
const callManager = require('./src/CallManager.js');

async function main() {
  await callManager.init();
  callManager.processCalls();

  if (config.CLAIM) {
    await claimer.init();
    claimer.process();
  }

  if (config.TAKE) {
    await taker.init();
    taker.process();
  }
}

main();
