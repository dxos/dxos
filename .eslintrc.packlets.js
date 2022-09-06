//
// Copyright 2022 DXOS.org
//

require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  extends: [
    './.eslintrc.js',
    'plugin:@dxos/packlets'
  ]
};
