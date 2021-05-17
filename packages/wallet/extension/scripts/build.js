const { NodeModulesPolyfillPlugin } = require('@esbuild-plugins/node-modules-polyfill')
const NodeGlobalsPolyfillPlugin = require('./globals-plugin')
const { build } = require('esbuild')

; (async () => {
  const result = await build({
    entryPoints: ['src/background/background.ts', 'src/popup/main.tsx'],
    outdir: 'dist',
    write: true,
    bundle: true,
    plugins: [
      NodeModulesPolyfillPlugin(),
      NodeGlobalsPolyfillPlugin(),
    ]
  })

  console.log(result)
})()

