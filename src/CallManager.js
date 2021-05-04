const config = require('../config.js');
const { sleepThread, getContracts, web3 } = require('./utils');

const callsBuffer = [];
const multiCallsBuffer = [];
let multicall;

class CallManager {
  async init() {
    multicall = (await getContracts()).multicall;
  }

  async call(method) {
    const consult = {
      method
    };

    callsBuffer.push(consult);

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

    multiCallsBuffer.push(consult);

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

      multiCallsBuffer.push(consults[i]);
    }

    while (consults.some(c => c.response == undefined)) {
      await sleepThread();
    }

    return consults.map(c => c.response);
  }

  async processCalls() {
    for (let awaitCont = 0;; awaitCont += config.AWAIT_THREAD) {
      if (callsBuffer.length > 0) { // First send all simple calls
        await this.sendCall();
      } else {
        if (
          multiCallsBuffer.length > 0 &&
          (
            multiCallsBuffer.length >= config.MAX_CALLS ||
            awaitCont > config.AWAIT_CALL
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
    const call = callsBuffer.shift();
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
      const resp = await multicall.methods.aggregate(multicallArg).call();
      this.translateResults(calls, resp.returnData);
    } catch (error) {
      console.log('SendMultiCall', error);
      for (let i = 0; i < calls.length; i++)
        multiCallsBuffer.push(calls[i]);
    }
  }

  getCalls() {
    const calls = [];

    for (let i = 0; i < config.MAX_CALLS && multiCallsBuffer.length; i++) {
      const call = multiCallsBuffer.shift();
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
        callData: web3.eth.abi.encodeFunctionCall(method._method, method.arguments),
      });
    }

    return ret;
  }

  translateResults(calls, returnData) {
    for (let i = 0; i < calls.length; i++) {
      const aux = web3.eth.abi.decodeParameters(
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

module.exports = new CallManager();