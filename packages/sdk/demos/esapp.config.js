const { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, NodeModulesPlugin } = require('@dxos/esbuild-plugins')

module.exports = {
  plugins: [
    NodeGlobalsPolyfillPlugin(),
    FixMemdownPlugin(),
    NodeModulesPlugin()
  ]
}
