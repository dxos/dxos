//
// Copyright 2022 DXOS.org
//

module.exports = {
  extends: [
    'plugin:mocha/recommended'
  ],
  rules: {
    '@stayradiated/prefer-arrow-functions/prefer-arrow-functions': 'off',
    'mocha/max-top-level-suites': 'off',
    'mocha/no-global-tests': 'off'
  }
};
