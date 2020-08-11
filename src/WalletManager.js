const { bn, sleepThread } = require('./utils.js');

const Status = {
  FREE: 'free',
  SENT: 'sent',
  COMPLETE: 'complete',
};

module.exports = class WalletManager {
  constructor() {
    this.nonces = [];
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
    // TODO: improve this, check the unconfirm txs
    const lastNonce = await process.web3.eth.getTransactionCount(this.address);

    this.nonces.push({
      number: lastNonce,
      status: Status.COMPLETE,
    });
  }

  getNonce() {
    let nonce = this.nonces.find(x => x.status === Status.FREE);

    if (nonce)
      return nonce;

    nonce = {
      number: ++ this.nonces[this.nonces.length - 1].number,
      status: Status.SENT,
    };

    this.nonces.push(nonce);

    return nonce;
  }

  async sendTx(func) {
    const nonce = this.getNonce();

    const gas = await this.estimateGas(func, nonce);

    if (gas instanceof Error) {
      nonce.status = Status.FREE;
      return gas;
    }

    let txHash;

    try {
      const gasPrice = await process.web3.eth.getGasPrice();

      console.log(
        '# Wallet Manager { Address:', this.address, 'Gas:', gas.toString(), '} Send:\n',
        '\t' + func._method.name + '(' + func.arguments + ')'
      );

      txHash = await func.send({
        from: this.address,
        gasPrice,
        gas,
        nonce: nonce.number,
      });
    } catch (error) {
      nonce.status = Status.FREE;
      console.log(
        '# Wallet Manager/', this.address, '/Error on sendTx:\n',
        '\t' + func._method.name + '(' + func.arguments + ')\n',
        '\t' + error
      );

      return error;
    }

    nonce.status = Status.COMPLETE;

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
        nonce: nonce.number,
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