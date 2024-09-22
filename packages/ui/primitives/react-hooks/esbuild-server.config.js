//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Are these required?

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
    NodeModulesPlugin()
  ],
  outdir: 'out',
  overrides: {
    sourcemap: 'inline'
  }
};
