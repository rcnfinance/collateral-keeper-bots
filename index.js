const init = require('./src/init.js');
const Claimer = require('./src/bots/Claimer.js');
const Taker = require('./src/bots/Taker.js');

async function main() {
  await init();
  process.callManager.processCalls();

  if (process.claimOn) {
    const claimer = new Claimer();
    claimer.process();
  }

  if (process.takeOn) {
    const taker = new Taker();
    await taker.init();
    taker.process();
  }
}

main();
