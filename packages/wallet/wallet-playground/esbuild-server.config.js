const { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, NodeModulesPlugin } = require('@dxos/esbuild-plugins');
const { ConfigPlugin } = require('@dxos/config/esbuild-plugin');

module.exports = {
  overrides: {
    define: {
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG),
    }
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
  staticDir: 'public'
};
