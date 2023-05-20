//
// Copyright 2022 DXOS.org
//

module.exports = {
  extends: ['plugin:mocha/recommended'],
  rules: {
    'mocha/max-top-level-suites': 'off',
    'mocha/no-mocha-arrows': 'off',
    'mocha/no-global-tests': 'off',
    'mocha/no-setup-in-describe': 'off',
    'mocha/no-sibling-hooks': 'off',
  },
};
