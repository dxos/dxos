//
// Copyright 2020 DXOS.org
//

const { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, NodeModulesPlugin } = require('@dxos/esbuild-plugins');
const { ConfigPlugin } = require('@dxos/config/esbuild-plugin');

/** @type {import('@dxos/esbuild-server').Config} */
module.exports = {
  entryPoints: [
    'src/main.tsx'
  ],
  outdir: 'out',
  plugins: [
    NodeGlobalsPolyfillPlugin(),
    FixMemdownPlugin(),
    NodeModulesPlugin(),
    ConfigPlugin()
  ],
  staticDir: 'public'
};
