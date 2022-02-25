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
    NodeGlobalsPolyfillPlugin(),
    FixMemdownPlugin(),
    NodeModulesPlugin(),
    ConfigPlugin()
  ],
  outdir: 'out',
  staticDir: 'public'
};
