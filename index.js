const init = require('./src/init.js');
const Claimer = require('./src/bots/Claimer.js');
const Taker = require('./src/bots/Taker.js');
const Reporter = require('./src/bots/Reporter.js');

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

  if (process.reporterOn) {
    const reporter = new Reporter();
    reporter.process();
  }
}

main();
