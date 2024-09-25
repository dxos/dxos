//
// Copyright 2020 DXOS.org
//

const {
  NodeGlobalsPolyfillPlugin,
  NodeModulesPlugin
} = require('@dxos/esbuild-plugins');

/** @type {import('@dxos/esbuild-server').Config} */
module.exports = {
  plugins: [
    NodeGlobalsPolyfillPlugin(),
    NodeModulesPlugin()
  ],
  outdir: 'out',
  overrides: {
    sourcemap: 'inline'
  }
};
