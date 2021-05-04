module.exports = {
  compilers: {
    solc: {
      version: '0.8.0',
      docker: false,
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        // evmVersion: 'istanbul',
      },
    },
  },
};