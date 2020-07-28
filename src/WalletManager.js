const { bn } = require('./utils.js');

module.exports = class WalletManager {
  constructor() {
    this.lastNonce;
    this.initWallet();
  }

  initWallet() {
    const pk = process.configDefault.BOT_PK;

    if (pk.slice(0, 2) !== '0x')
      throw new Error('Wallet Manager/ Wrong format: \n' + pk + ', use a hex bytes32 number(with 0x on the beginning)');

    if (process.web3.utils.isHexStrict(pk.slice(2)))
      throw new Error('Wallet Manager/ There are no private keys to instance the signers: ' + pk);

    const wallet = process.web3.eth.accounts.privateKeyToAccount(pk);
    process.web3.eth.accounts.wallet.add(wallet);

    console.log('# Wallet:', wallet.address);

    this.address = process.web3.eth.accounts.wallet[0].address;
  }

  async init() {
    this.lastNonce = await process.web3.eth.getTransactionCount(this.address);
  }

  async sendTx(func) {
    const nonce = this.lastNonce++;

    const gas = await this.estimateGas(func, nonce);
    if (gas instanceof Error) {
      this.lastNonce--;
      return gas;
    }

    console.log(
      '# Wallet Manager', this.address, 'Send:\n',
      '\t' + func._method.name + '(' + func.arguments + ')'
    );

    let txHash;

    try {
      const gasPrice = await process.web3.eth.getGasPrice();

      txHash = await func.send({
        from: this.address,
        gasPrice,
        gas,
        nonce,
      });
    } catch (error) {
      console.log(
        '# Wallet Manager/', this.address, '/Error on sendTx:\n',
        '\t' + func._method.name + '(' + func.arguments + ')\n',
        '\t' + error
      );

      return error;
    }

    console.log('# Wallet Manager/' + this.address + '/Complete:\n',
      '\t' + func._method.name + '(' + func.arguments + ')\n',
      '\ttxHash:', txHash.transactionHash);

    return txHash;
  }

  async estimateGas(func, nonce) {
    try {
      const gas = await func.estimateGas({
        from: this.address,
        gas: (await process.web3.eth.getBlock('latest')).gasLimit,
        nonce,
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