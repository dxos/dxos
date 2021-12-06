//
// Copyright 2021 DXOS.org
//

// const { yamlPlugin } = require('esbuild-plugin-yaml');

const { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, NodeModulesPlugin } = require('@dxos/esbuild-plugins');
const { ConfigPlugin } = require('@dxos/config/esbuild-plugin');

module.exports = {
  overrides: {
    sourcemap: true
  },
  entryPoints: [
    'src/index.tsx'
  ],
  plugins: [
    NodeGlobalsPolyfillPlugin(),
    FixMemdownPlugin(),
    NodeModulesPlugin(),
    ConfigPlugin(),
    // yamlPlugin()
  ],
  outdir: 'dist',
  staticDir: 'public'
};
