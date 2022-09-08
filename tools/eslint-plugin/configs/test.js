//
// Copyright 2022 DXOS.org
//

module.exports = {
  extends: [
    'plugin:jest/recommended'
  ],
  rules: {
    'jest/no-conditional-expect': 'off',
    'jest/no-done-callback': 'off',
    'jest/no-standalone-expect': 'off',
    'jest/valid-describe-callback': 'off',
    'jest/valid-expect': 'off'
  }
};
