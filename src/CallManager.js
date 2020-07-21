const { sleep } = require('./utils');

module.exports = class CallManager {
  constructor() {
    this.callsBuffer = [];
    this.multiCallsBuffer = [];
  }

  async call(method) {
    const consult = {
      method
    };

    this.callsBuffer.push(consult);

    while (consult.response === undefined) {
      await sleep(process.configDefault.AWAIT_THREAD);
    }

    return consult.response;
  }

  // TODO can array methos as input
  async multiCall(method) {
    const consult = {
      method
    };

    this.multiCallsBuffer.push(consult);

    while (consult.response === undefined) {
      await sleep(process.configDefault.AWAIT_THREAD);
    }

    return consult.response;
  }

  async processCalls() {
    for (let awaitCont = 0;; awaitCont += process.configDefault.AWAIT_THREAD) {
      if (this.callsBuffer.length > 0) { // First send all simple calls
        await this.sendCall();
      } else {
        if (
          this.multiCallsBuffer.length >= process.configDefault.CALL_MANAGER.MAX_CALLS ||
          awaitCont > process.configDefault.CALL_MANAGER.AWAIT_CALL
        ) {
          await this.sendMultiCall();
          awaitCont = 0;
        }
      }

      await sleep(process.configDefault.AWAIT_THREAD);
    }
  }

  // Internal help functions

  async sendCall() {
    const call = this.callsBuffer.shift();
    const method = call.method;

    try {
      call.response = await method.call();
    } catch (error) {
      console.log(method._parent._address, method._method.name, method._method.inputs);
      console.log(error);
      call.response = error;
    }
  }

  async sendMultiCall() {
    const calls = this.getCalls();

    try {
      const multicallArg = await this.toMulticallArg(calls);
      const resp = await process.contracts.multicall.methods.aggregate(multicallArg).call();
      this.translateResults(calls, resp.returnData);
    } catch (error) {
      console.log(calls, error);
      for (let i = 0; i < calls.length; i++)
        this.calls.push(calls[i]);
    }
  }

  getCalls() {
    const calls = [];

    for (let i = 0; i < process.configDefault.CALL_MANAGER.MAX_CALLS && this.multiCallsBuffer.length; i++) {
      const call = this.multiCallsBuffer.shift();
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