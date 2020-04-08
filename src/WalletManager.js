const { bn, sleep } = require('./utils/utils.js');

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

      if (process.w3.utils.isHexStrict(pk.slice(2)))
        throw new Error('##Wallet Manager/There are no private keys to instance the signers: ' + pk);

      const wallet = process.w3.eth.accounts.privateKeyToAccount(pk);
      process.w3.eth.accounts.wallet.add(wallet);

      this.push(wallet.address);
    }
  }

  async pop() {
    while (!this.addresses.length) {
      console.log('##Wallet Manager/Wait for an available wallet');
      await sleep(2000);
    }

    // TODO: whats happends if the wallet dont have eth balance?

    return this.addresses.pop();
  }

  push(address) {
    return this.addresses.push(address);
  }

  async sendTx(func, objTx = { address: undefined, value: undefined, gasPrice: undefined, }) {
    if(!objTx.address)
      objTx.address = await this.pop();

    objTx.value = objTx.value ? objTx.value : 0;

    const gas = await this.estimateGas(func, objTx);
    if (gas instanceof Error) return gas;

    if(!objTx.gasPrice)
      objTx.gasPrice = await process.w3.eth.getGasPrice();

    const txHash = await func.send(
      {
        from: objTx.address,
        gasPrice: objTx.gasPrice,
        gas: gas,
        value: objTx.value,
      },
      (error, txHash) => {
        if (error) {
          return error;
        }
        console.log('##Wallet Manager/Tx Hash: ' + txHash + ', ' + func._method.name + '(' + func.arguments + ')');
      }
    );

    this.push(objTx.address);

    return txHash;
  }

  async estimateGas(func, objTx) {
    let gas;

    try {
      const gasLimit = (await process.w3.eth.getBlock('latest')).gasLimit;

      gas = await func.estimateGas({
        from: objTx.address,
        gas: gasLimit,
        value: objTx.value,
      });
    } catch (error) {
      console.log(error);
      return error;
    }
    return bn(gas).mul(bn(12000)).div(bn(10000));
  }
};
