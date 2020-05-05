const { bn } = require('./utils.js');

module.exports = class WalletManager {
  constructor(pks) {
    this.addresses = [];
    this.initWallets(pks);
  }

  initWallets(pks) {
    for (let i = 0; i < pks.length; i++) {
      const pk = pks[i];

      if (pk.slice(0, 2) !== '0x')
        throw new Error('##Wallet Manager/Wrong format: ' + pk + ', use a hex bytes32 number(with 0x on the beginning)');

      if (process.web3.utils.isHexStrict(pk.slice(2)))
        throw new Error('##Wallet Manager/There are no private keys to instance the signers: ' + pk);

      const wallet = process.web3.eth.accounts.privateKeyToAccount(pk);
      process.web3.eth.accounts.wallet.add(wallet);

      console.log('##New Wallet:', wallet.address);
      this.push(wallet.address);
    }
  }

  pop() {
    if (!this.addresses.length) {
      console.log('##Wallet Manager/Wait for an available wallet');
      return;
    }

    // TODO: whats happends if the wallet dont have eth balance?

    return this.addresses.pop();
  }

  push(address) {
    return this.addresses.push(address);
  }

  async sendTx(func, objTx = { address: undefined, value: undefined, gasPrice: undefined, }) {
    if (!objTx.address) {
      objTx.address = this.pop();
      if (!objTx.address) {
        return;
      }
    } else {
      this.addresses.filter(x => x != objTx.address);
    }

    objTx.value = objTx.value ? objTx.value : 0;

    let txHash;

    try {
      const gas = await this.estimateGas(func, objTx);
      if (gas instanceof Error) {
        this.push(objTx.address);
        return gas;
      }

      if (!objTx.gasPrice)
        objTx.gasPrice = await process.web3.eth.getGasPrice();

      console.log('##Wallet Manager/' + objTx.address + '/Send:\n' +
      '\t' + func._method.name + '(' + func.arguments + ')');
      txHash = await func.send({
        from: objTx.address,
        gasPrice: objTx.gasPrice,
        gas: gas,
        value: objTx.value,
      });
      console.log('##Wallet Manager/' + objTx.address + '/Complete:\n' +
      '\t' + func._method.name + '(' + func.arguments + ')');
    } catch (error) {
      console.log(
        '##Wallet Manager/' + objTx.address + '/Error on sendTx:\n' +
        '\t' + func._method.name + '(' + func.arguments + ')\n' +
        '\t' + error);
      txHash = error;
    }

    this.push(objTx.address);

    return txHash;
  }

  async estimateGas(func, objTx) {
    try {
      const gas = await func.estimateGas({
        from: objTx.address,
        gas: (await process.web3.eth.getBlock('latest')).gasLimit,
        value: objTx.value,
      });

      return bn(gas).mul(bn(12000)).div(bn(10000));
    } catch (error) {
      console.log(
        '##Wallet Manager/' + objTx.address + '/Error on estimateGas:\n' +
        '\t' + func._method.name + '(' + func.arguments + ')\n' +
        '\t' + error);
      return error;
    }
  }
};
