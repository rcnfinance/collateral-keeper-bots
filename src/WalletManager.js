const utils = require('./utils/utils.js');
const { IntentAction, Wallet, IntentBuilder, Provider, DefaultConf, Contract } = require('marmojs');

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

  async sendTx(func, objTx = { value: undefined, gasPrice: undefined, }) {
    const action = new IntentAction(
      func._parent._address,
      0,
      func.encodeABI(),
      new Contract(func._parent._address).functionEncoder(
        func._method.name,
        func._method.inputs.map((x) => x.type),
        func._method.outputs.map((x) => x.type)
      )
    )

    const intent = new IntentBuilder()
        .withIntentAction(action)
        .withSalt(`0x${new Date().getTime()}`)
        .build();
    
    const signedIntent = await this.wallet.sign(intent);
    await signedIntent.relay(this.provider);
    
    return "0x";
  }
};
