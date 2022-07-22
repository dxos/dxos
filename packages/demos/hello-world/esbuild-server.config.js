//
// Copyright 2020 DXOS.org
//

const { NodeGlobalsPolyfillPlugin } = require('@dxos/esbuild-plugins');
const { ConfigPlugin } = require('@dxos/config/esbuild-plugin');

/** @type {import('@dxos/esbuild-server').Config} */
module.exports = {
  entryPoints: [
    'src/main.tsx'
  ],
  outdir: 'out',
  overrides: {
    sourcemap: 'inline'
  },
  plugins: [
    NodeGlobalsPolyfillPlugin(),
    ConfigPlugin()
  ],
  staticDir: 'public'
};
