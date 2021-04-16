const {
  web3,
  bn,
  sleepThread,
  initWallet,
} = require('./utils.js');

let busy = false;

class WalletManager {
  constructor() {
    this.address = initWallet();

    console.log('# Wallet:', this.address);
  }

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
        '# Wallet Manager Send { Address:', this.address, 'Gas:', txObj.gas.toString(), '}\n',
        '\t' + func._method.name + '(' + func.arguments + ')'
      );

      txHash = await func.send({
        from: this.address,
        gasPrice: txObj.gasPrice,
        gas: txObj.gas,
        value : txObj.value,
      });
    } catch (error) {
      busy = false;
      console.log(
        '# Wallet Manager Error on sendTx { Address:', this.address, '}\n',
        '\t' + func._method.name + '(' + func.arguments + ')\n',
        '\t' + error
      );

      return error;
    }

    busy = false;
    console.log('# Wallet Manager Complete { Address:', this.address, 'Gas:', txObj.gas.toString(), '}\n',
      '\t' + func._method.name + '(' + func.arguments + ')\n',
      '\ttxHash:', txHash.transactionHash);

    return txHash;
  }

  async estimateGas(func, txObj = {}) {
    if (!txObj.value)
      txObj.value = bn(0);

    try {
      const gas = await func.estimateGas({
        from: this.address,
        gas: (await web3.eth.getBlock('latest')).gasLimit,
        value: txObj.value,
      });

      return bn(gas).mul(bn(12000)).div(bn(10000));
    } catch (error) {
      console.log(
        '# Wallet Manager/', this.address, '/Error on estimateGas:\n',
        '\t' + func._method.name + '(' + func.arguments + ')\n',
        '\t' + error);
      return error;
    }
  }
};

module.exports = new WalletManager();
