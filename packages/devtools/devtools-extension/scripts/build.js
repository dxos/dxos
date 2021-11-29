//
// Copyright 2020 DXOS.org
//

const { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, NodeModulesPlugin } = require('@dxos/esbuild-plugins');
const { build } = require('esbuild');
const rmdir = require('rmdir');
const { promisify } = require('util');
const copy = require('copy');
const { join } = require('path');
const fs = require('fs');
const chalk = require('chalk');

const distDir = join(__dirname, '../dist');
const srcDir = join(__dirname, '../src');
const publicDir = join(__dirname, '../public');

(async () => {
  if (fs.existsSync(distDir)) {
    await promisify(rmdir)(distDir);
  }

  try {
    await build({
      entryPoints: [
        join(srcDir, 'background/main.ts'),
        join(srcDir, 'content-script/main.ts'),
        join(srcDir, 'devtools/main.ts'),
        join(srcDir, 'devtools-client-api/main.ts'),
        join(srcDir, 'main-panel/main.ts'),
        join(srcDir, 'popup/main.tsx'),
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
    console.error(err);
    process.exit(-1); // Diagnostics are already printed.
  }

  await promisify(copy)(`${publicDir}/**`, distDir);
})()
