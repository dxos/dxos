//
// Copyright 2020 DXOS.org
//

const { FixMemdownPlugin, NodeModulesPlugin, NodeGlobalsPolyfillPlugin } = require('@dxos/esbuild-plugins');
const { ConfigPlugin } = require('@dxos/config/esbuild-plugin');

/** @type {import('@dxos/esbuild-server').Config} */
module.exports = {
  entryPoints: [
    'src/singleton/main.ts',
    'src/singleton/shared-worker.ts'
  ],
  outdir: 'dist/singleton',
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
