// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@dxos/eslint-plugin/eslint-patch')

module.exports = {
  ignorePatterns: [
    'src/version.ts' // Generated file.
  ],
  extends: [
    'plugin:@dxos/recomended'
  ]
};
