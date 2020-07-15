const mainet = {
  node: '',
  collateralAddress: '',
  multicallAddress: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441',
  callManager: {
    awaitCall: 100,
    awaitResponse: 100,
    maxCalls: 25,
  }
};

const ropsten = {
  node: 'https://ropsten.infura.io/v3/',
  collateralAddress: '0x391720EfbaEA47130F198263F7c3abEFC230d14b',
  multicallAddress: '0x53C43764255c17BD724F74c4eF150724AC50a3ed',
  callManager: {
    awaitCall: 100,
    awaitResponse: 100,
    maxCalls: 25,
  }
};

module.exports = ropsten;