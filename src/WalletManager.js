const {
  web3,
  bn,
  sleepThread,
  initWallet,
  STR,
} = require('./utils.js');

let busy = false;
const headLog = STR.magenta + 'Wallet Manager:' + STR.reset;
const address = initWallet()

class WalletManager {
  async sendTx(func, txObj = { }) {
    while (busy)
      await sleepThread();

    busy = true;

    if (!txObj.value)
      txObj.value = bn(0);

    if (!txObj.gas)
      txObj.gas = await this.estimateGas(func, txObj);

    if (txObj.gas instanceof Error) {
      busy = false;
      return txObj.gas;
    }

    let txHash;

    try {
      if (!txObj.gasPrice)
        txObj.gasPrice = await web3.eth.getGasPrice();

      console.log(
        headLog,
        'Send { Address:' + address + 'Gas:' + txObj.gas.toString() + '}\n' +
        '\t' + func._method.name + '(' + func.arguments + ')',
        STR.reset
      );

      txHash = await func.send({
        from: address,
        gasPrice: txObj.gasPrice,
        gas: txObj.gas,
        value : txObj.value,
      });
    } catch (error) {
      busy = false;
      console.log(
        headLog,
        STR.red +
        'Error on sendTx { Address:' + address + '}\n' +
          '\t' + func._method.name + '(' + func.arguments + ')\n' +
          '\t' + error,
        STR.reset
      );

      return error;
    }

    busy = false;
    console.log(
      headLog,
      STR.green +
      'Complete { Address:' + address + 'Gas:' + txObj.gas.toString() + '}\n' +
        '\t' + func._method.name + '(' + func.arguments + ')\n' +
        '\ttxHash: ' + txHash.transactionHash,
      STR.reset
    );

    return txHash;
  }

  async estimateGas(func, txObj = {}) {
    if (!txObj.value)
      txObj.value = bn(0);

    try {
      const gas = await func.estimateGas({
        from: address,
        gas: (await web3.eth.getBlock('latest')).gasLimit,
        value: txObj.value,
      });

      return bn(gas).mul(bn(12000)).div(bn(10000));
    } catch (error) {
      console.log(
        headLog,
        STR.yellow +
        'Error on estimateGas:\n' +
          '\t' + func._method.name + '(' + func.arguments + ')\n' +
          '\t' + error,
        STR.reset
      );
      return error;
    }
  }
};

module.exports = new WalletManager();
