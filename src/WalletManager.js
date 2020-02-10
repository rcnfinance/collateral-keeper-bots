const utils = require('./utils/utils.js');
const bn = utils.bn;

module.exports = class WalletManager {
  constructor(pk) {
    this.address = this.initWallet(pk);
  }

  initWallet(pk) {
    if (pk.slice(0, 2) !== '0x')
      throw new Error('Wrong format: ' + pk + ', use a hex bytes32 number(with 0x on the beginning)');

    if (process.w3.utils.isHexStrict(pk.slice(2)))
      throw new Error('There are no private keys to instance the signers: ' + pk);

    // TODO add marmo
    const wallet = process.w3.eth.accounts.privateKeyToAccount(pk);
    process.w3.eth.accounts.wallet.add(wallet);

    return wallet.address;
  }

  async sendTx(func, objTx = { value: undefined, gasPrice: undefined, }) {
    const gas = await this.estimateGas(func, objTx);
    if (gas instanceof Error) return gas;

    if(!objTx.gasPrice)
      objTx.gasPrice = await process.w3.eth.getGasPrice();

    const txHash = await func.send(
      {
        from: this.address,
        gasPrice: objTx.gasPrice,
        gas: gas,
        value: objTx.value ? objTx.value : 0,
      },
      (error, txHash) => {
        if (error) {
          return error;
        }
        console.log('Tx Hash: ' + txHash + ', ' + func._method.name + '(' + func.arguments + ')');
      }
    );

    return txHash;
  }

  async estimateGas(func, objTx) {
    let gas;

    try {
      const gasLimit = (await process.w3.eth.getBlock('latest')).gasLimit;

      gas = await func.estimateGas({
        from: this.address,
        gas: gasLimit,
        value: objTx.value,
      });
    } catch (error) {
      console.log('Error on estimateGas: ' + func._method.name + '(' + func.arguments + ')');
      return error;
    }
    return bn(gas).mul(bn(12000)).div(bn(10000));
  }
};
