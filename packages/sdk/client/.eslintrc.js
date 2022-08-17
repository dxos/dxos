// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@dxos/eslint-plugin/eslint-patch')

module.exports = {
  ignorePatterns: [
    'client.d.ts',
    'client.js',
    'esbuild-server.config.js',
    'src/packlets/proto/gen/*',
    'src/packlets/proxy/version.ts' // Generated file.
  ],
  extends: [
    'plugin:@dxos/recomended'
  ]
};
