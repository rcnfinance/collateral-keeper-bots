const { IntentAction, Wallet, IntentBuilder, Provider, DefaultConf, Contract } = require('marmojs');
const { STATE } = require('./utils/utils.js');

module.exports = class WalletManager {
  constructor(pk) {
    this.wallet = new Wallet(pk, DefaultConf.ROPSTEN);
    this.address = this.wallet.address;
    this.provider = new Provider(
      process.env.node,
      'https://marmo-relayer-ropsten.rcn.loans'
    );
    this.provider.asDefault();
  }

  async sendTx(tx) {
    const action = new IntentAction(
      tx._parent._address,
      0,
      tx.encodeABI(),
      new Contract(tx._parent._address).functionEncoder(
        tx._method.name,
        tx._method.inputs.map((x) => x.type),
        tx._method.outputs.map((x) => x.type)
      )
    );

    const intent = new IntentBuilder()
      .withIntentAction(action)
      .withSalt(`0x${new Date().getTime()}`)
      .build();

    const signedIntent = await this.wallet.sign(intent);
    await signedIntent.relay(this.provider);

    return signedIntent;
  }

  async getState(signedIntent) {
    const code = (await signedIntent.status(this.provider)).code;

    console.log(await signedIntent.status(this.provider))

    if (code === 0 || code === 1)
      return STATE.busy;
    else if (code === 2)
      return STATE.finish;
    else if (code === 3)
      return STATE.Error;
  }
};
