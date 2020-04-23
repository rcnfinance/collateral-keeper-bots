const { bn, sleep } = require('./utils.js');

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

  async pop() {
    while (!this.addresses.length) {
      console.log('##Wallet Manager/Wait for an available wallet');
      await sleep(20000);
    }

    // TODO: whats happends if the wallet dont have eth balance?

    return this.addresses.pop();
  }

  push(address) {
    return this.addresses.push(address);
  }

  async sendTx(func, objTx = { address: undefined, value: undefined, gasPrice: undefined, }) {
    if (!objTx.address)
      objTx.address = await this.pop();
    else
      this.addresses.filter(x => x != objTx.address);

    objTx.value = objTx.value ? objTx.value : 0;

    const gas = await this.estimateGas(func, objTx);
    if (gas instanceof Error) {
      this.push(objTx.address);
      return gas;
    }

    if (!objTx.gasPrice)
      objTx.gasPrice = await process.web3.eth.getGasPrice();

    let txHash;

    try {
      console.log('##Wallet Manager/Send:' + func._method.name + '(' + func.arguments + ')');
      txHash = await func.send({
        from: objTx.address,
        gasPrice: objTx.gasPrice,
        gas: gas,
        value: objTx.value,
      });
    } catch (error) {
      console.log(
        '##Wallet Manager/Error on sendTx:\n' +
        '\t' + func._method.name + '(' + func.arguments + ')' + '\n' +
        '\t' + error);
      txHash = error;
    }

    this.push(objTx.address);

    return txHash;
  }

  async estimateGas(func, objTx) {
    let gas;

    try {
      const gasLimit = (await process.web3.eth.getBlock('latest')).gasLimit;

      gas = await func.estimateGas({
        from: objTx.address,
        gas: gasLimit,
        value: objTx.value,
      });
    } catch (error) {
      console.log(
        '##Wallet Manager/Error on estimateGas:\n' +
        func._method.name + '(' + func.arguments + ')' + '\n' +
        error);
      return error;
    }
    return bn(gas).mul(bn(12000)).div(bn(10000));
  }
};
