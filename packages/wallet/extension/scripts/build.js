const { NodeModulesPolyfillPlugin } = require('@esbuild-plugins/node-modules-polyfill')
const NodeGlobalsPolyfillPlugin = require('./globals-plugin')
const { build } = require('esbuild')
const rmdir = require('rmdir');
const { promisify } = require('util')
const copy = require('copy')
const { join } = require('path')
const fs = require('fs')
const chalk = require('chalk')

const distDir = join(__dirname, '../dist')
const srcDir = join(__dirname, '../src')
const publicDir = join(__dirname, '../public')

; (async () => {
  if(fs.existsSync(distDir)) {
    await promisify(rmdir)(distDir)
  }

  try {
    await build({
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
        FixMemdownPlugin(),
      ],
      watch: process.argv.includes('--watch') ? {onRebuild: ((error) => {
        if (error) {
          console.error(chalk.red('\nBuild failed.'))
        } else {
          console.log(chalk.green(`\nRebuild finished.`))
        }
       })} : false,
    })
  } catch {
    process.exit(-1); // Diagnostics are already printed.
  }
  

  await promisify(copy)(`${publicDir}/**`, distDir)
})()

/**
 * @returns {import('esbuild').Plugin}
 */
function FixMemdownPlugin() {
  return {
    name: 'fix-memdown-plugin',
    setup({ onResolve }) {
      onResolve({ filter: /^immediate$/ }, arg => {
        return {
          path: require.resolve(arg.path, { paths: [arg.resolveDir] })
        }
      })
    }
  }
}