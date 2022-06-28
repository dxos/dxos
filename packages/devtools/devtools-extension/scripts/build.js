//
// Copyright 2020 DXOS.org
//

const chalk = require('chalk');
const copy = require('copy');
const { build } = require('esbuild');
const fs = require('fs');
const { join } = require('path');
const rmdir = require('rmdir');
const { promisify } = require('util');

const { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, NodeModulesPlugin } = require('@dxos/esbuild-plugins');

const distDir = join(__dirname, '../dist');
const srcDir = join(__dirname, '../src');
const publicDir = join(__dirname, '../public');

void (async () => {
  if (fs.existsSync(distDir)) {
    await promisify(rmdir)(distDir);
  }

  try {
    await build({
      entryPoints: [
        join(srcDir, 'background.ts'),
        join(srcDir, 'content.ts'),
        join(srcDir, 'devtools.ts'),
        join(srcDir, 'panel.ts'),
        join(srcDir, 'sandbox.ts')
      ],
      outdir: distDir,
      write: true,
      bundle: true,
      plugins: [
        NodeModulesPlugin(),
        NodeGlobalsPolyfillPlugin(),
        FixMemdownPlugin()
      ],
      watch: process.argv.includes('--watch') ? {
        onRebuild: ((error) => {
          if (error) {
            console.error(chalk.red('\nBuild failed.'));
          } else {
            console.log(chalk.green('\nRebuild finished.'));
          }
        })
      } : false
    });
  } catch (err) {
    console.error(err);
    process.exit(-1); // Diagnostics are already printed.
  }

  await promisify(copy)(`${publicDir}/**`, distDir);
})();
