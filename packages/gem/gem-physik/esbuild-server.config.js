//
// Copyright 2020 DXOS.org
//

const {
  FixMemdownPlugin,
  NodeGlobalsPolyfillPlugin,
  NodeModulesPlugin
} = require('@dxos/esbuild-plugins');

/** @type {import('@dxos/esbuild-server').Config} */
module.exports = {
  plugins: [
    NodeGlobalsPolyfillPlugin(),
    FixMemdownPlugin(),
    NodeModulesPlugin()
  ],
  overrides: {
    sourcemap: 'inline'
  }
};
