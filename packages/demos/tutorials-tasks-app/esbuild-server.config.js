//
// Copyright 2021 DXOS.org
//

const { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, NodeModulesPlugin } = require('@dxos/esbuild-plugins');
const { ConfigPlugin } = require('@dxos/config/esbuild-plugin');

module.exports = {
  overrides: {
    sourcemap: true
  },
  entryPoints: [
    'src/main.tsx'
  ],
  plugins: [
    ConfigPlugin(),
    FixMemdownPlugin(),
    NodeGlobalsPolyfillPlugin(),
    NodeModulesPlugin()
  ],
  outdir: 'out',
  staticDir: 'public'
};
