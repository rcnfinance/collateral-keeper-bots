const { sleepThread } = require('./utils');

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
      await sleepThread();
    }

    return consult.response;
  }

  async multiCall(method) {
    const consult = {
      method,
      to: method.to ? method.to : method._parent._address,
    };

    this.multiCallsBuffer.push(consult);

    while (consult.response == undefined) {
      await sleepThread();
    }

    return consult.response;
  }

  async multiCallArray(methods) {
    const consults = [];

    for (let i = 0; i < methods.length; i++) {
      consults.push({
        method: methods[i],
        to: methods[i].to ? methods[i].to : methods[i]._parent._address,
      });

      this.multiCallsBuffer.push(consults[i]);
    }

    while (consults.some(c => c.response == undefined)) {
      await sleepThread();
    }

    return consults.map(c => c.response);
  }

  async processCalls() {
    for (let awaitCont = 0;; awaitCont += process.configDefault.AWAIT_THREAD) {
      if (this.callsBuffer.length > 0) { // First send all simple calls
        await this.sendCall();
      } else {
        if (
          this.multiCallsBuffer.length > 0 &&
          (
            this.multiCallsBuffer.length >= process.configDefault.MAX_CALLS ||
            awaitCont > process.configDefault.AWAIT_CALL
          )
        ) {
          await this.sendMultiCall();
          awaitCont = 0;
        }
      }

      await sleepThread();
    }
  }

  // Internal help functions

  async sendCall() {
    const call = this.callsBuffer.shift();
    const method = call.method;

    try {
      call.response = await method.call();
    } catch (error) {
      console.log('SendCall', error.message);
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
      console.log('SendMultiCall', error);
      for (let i = 0; i < calls.length; i++)
        this.multiCallsBuffer.push(calls[i]);
    }
  }

  getCalls() {
    const calls = [];

    for (let i = 0; i < process.configDefault.MAX_CALLS && this.multiCallsBuffer.length; i++) {
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
        target: calls[i].to,
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