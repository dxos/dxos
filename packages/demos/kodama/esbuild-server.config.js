//
// Copyright 2020 DXOS.org
//

const { yamlPlugin } = require('esbuild-plugin-yaml');

const {
  FixMemdownPlugin,
  NodeGlobalsPolyfillPlugin,
  NodeModulesPlugin
} = require('@dxos/esbuild-plugins');

/** @type {import('@dxos/esbuild-server').Config} */
module.exports = {
  plugins: [
    FixMemdownPlugin(),
    NodeGlobalsPolyfillPlugin(),
    NodeModulesPlugin(),
    yamlPlugin()
  ],
  outdir: 'out',
  overrides: {
    sourcemap: 'inline'
  }
};
