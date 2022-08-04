//
// Copyright 2020 DXOS.org
//

const { FixMemdownPlugin, NodeModulesPlugin, NodeGlobalsPolyfillPlugin } = require('@dxos/esbuild-plugins');
const { ConfigPlugin } = require('@dxos/config/esbuild-plugin');

/** @type {import('@dxos/esbuild-server').Config} */
module.exports = {
  entryPoints: [
    'src/singleton.ts'
  ],
  outdir: 'out',
  overrides: {
    sourcemap: true
  },
  plugins: [
    FixMemdownPlugin(),
    NodeModulesPlugin(),
    NodeGlobalsPolyfillPlugin(),
    ConfigPlugin()
  ],
  staticDir: 'public'
};
