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
