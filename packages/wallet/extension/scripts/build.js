const { NodeModulesPolyfillPlugin } = require('@esbuild-plugins/node-modules-polyfill')
const NodeGlobalsPolyfillPlugin = require('./globals-plugin')
const { build } = require('esbuild')
const rmdir = require('rmdir');
const { promisify } = require('util')
const copy = require('copy')
const { join } = require('path')

const distDir = join(__dirname, '../dist')
const srcDir = join(__dirname, '../src')
const publicDir = join(__dirname, '../public')

; (async () => {
  await promisify(rmdir)(distDir)

  const result = await build({
    entryPoints: [
      join(srcDir, 'background/background.ts'),
      join(srcDir, 'popup/main.tsx'),
    ],
    outdir: distDir,
    write: true,
    bundle: true,
    plugins: [
      NodeModulesPolyfillPlugin(),
      NodeGlobalsPolyfillPlugin(),
    ]
  })

  console.log(result)

  await promisify(copy)(`${publicDir}/**`, distDir)
})()

