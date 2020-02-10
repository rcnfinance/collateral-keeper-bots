module.exports = {
    "extends": "eslint:recommended",
    "env": {
      "browser": true,
      "es6": true,
      "node": true,
      "mocha": true,
      "jest": true
    },
    "globals" : {
      "artifacts": false,
      "contract": false,
      "assert": false,
      "web3": false
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
        "no-console": "off",
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
