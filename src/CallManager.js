const { sleep } = require('./utils');

module.exports = class CallManager {
  constructor() {
    this.buffer = [];
  }

  async call(method, unique = false) {
    if (unique) {
      try {
        return await method.call();
      } catch (error) {
        console.log(method._parent._address, method._method.name, method._method.inputs);
        console.log(error);
        return error;
      }
    }

    const consult = {
      method
    };

    this.buffer.push(consult);

    while (consult.response === undefined) {
      await sleep(process.environment.callManager.awaitResponse);
    }

    return consult.response;
  }

  async sendCalls() {
    for (;;) {
      const calls = this.getCalls();

      if(calls.length > 0)
        try {
          const multicallArg = await this.toMulticallArg(calls);
          const resp = await process.contracts.multicall.methods.aggregate(multicallArg).call();
          this.translateResults(calls, resp.returnData);
        } catch (error) {
          console.log(calls, error);
          for (let i = 0; i < calls.length; i++)
            this.buffer.push(calls[i]);
        }

      await sleep(process.environment.callManager.awaitCall);
    }
  }

  // Internal help functions

  getCalls() {
    const calls = [];

    for (let i = 0; i < process.environment.callManager.maxCalls; i++)
      if (this.buffer.length) {
        const call = this.buffer.shift();
        calls.push(call);
      }

    return calls;
  }

  async toMulticallArg(calls) {
    const ret = [];

    for (let i = 0; i < calls.length; i++) {
      const method = calls[i].method;

      ret.push({
        target: method._parent._address,
        callData: process.web3.eth.abi.encodeFunctionCall(method._method, method.arguments),
      });
    }

    return ret;
  }

  translateResults(calls, returnData) {
    for (let i = 0; i < calls.length; i++) {
      const aux = process.web3.eth.abi.decodeParameters(
        calls[i].method._method.outputs,
        returnData[i]
      );

      if (calls[i].method._method.outputs.length == 1) {
        calls[i].response = aux[0];
      } else {
        calls[i].response = aux;
      }
    }
  }
};