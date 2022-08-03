module.exports = {
  ignorePatterns: [
    'src/packlets/proto/gen/*',
    'src/packlets/proxy/version.ts' // Generated file.
  ],
  extends: [
    'plugin:@dxos/recomended'
  ]
};
