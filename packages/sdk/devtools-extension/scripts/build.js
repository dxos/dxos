const { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, NodeModulesPlugin } = require('@dxos/esbuild-plugins')
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
        join(srcDir, 'background/index.ts'),
        join(srcDir, 'content-script/index.ts'),
        join(srcDir, 'devtools/index.ts'),
        join(srcDir, 'devtools-client-api/index.ts'),
        join(srcDir, 'main-panel/index.ts'),
        join(srcDir, 'popup/index.tsx'),
      ],
      outdir: distDir,
      write: true,
      bundle: true,
      plugins: [
        NodeModulesPlugin(),
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
  } catch (err) {
    console.error(err); // \/ Turns out, they're not always printed.
    process.exit(-1); // Diagnostics are already printed.
  }
  

  await promisify(copy)(`${publicDir}/**`, distDir)
})()

