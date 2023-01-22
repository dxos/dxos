//
// Copyright 2020 DXOS.org
//

const chalk = require('chalk');
const copy = require('copy');
const { build } = require('esbuild');
const inlineImage = require('esbuild-plugin-inline-image');
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

  const config = {
    outdir: distDir,
    write: true,
    bundle: true,
    plugins: [
      NodeModulesPlugin(),
      inlineImage(),
      // Substitute '/*?url' imports with empty string.
      {
        name: 'url',
        setup: ({ onResolve, onLoad }) => {
          onResolve({ filter: /\?url$/ }, (args) => {
            return {
              path: args.path.replace(/\?url$/, '/empty-url'),
              namespace: 'url'
            };
          });

          onLoad({ filter: /\/empty-url/, namespace: 'url' }, async (args) => {
            return { contents: 'export default ""' };
          });
        }
      },
      // Substitute '/*?ttf' imports with empty string.
      {
        name: 'ttf',
        setup: ({ onResolve, onLoad }) => {
          onResolve({ filter: /\?\.ttf$/ }, (args) => {
            return {
              path: args.path.replace(/\?url$/, '/empty-ttf'),
              namespace: 'ttf'
            };
          });

          onLoad({ filter: /\/empty-ttf/, namespace: 'ttf' }, async (args) => {
            return { contents: 'export default ""' };
          });
        }
      }
    ],
    platform: 'browser',
    watch: process.argv.includes('--watch')
      ? {
          onRebuild: (error) => {
            if (error) {
              console.error(chalk.red('\nBuild failed.'));
            } else {
              console.log(chalk.green('\nRebuild finished.'));
            }
          }
        }
      : false
  };

  try {
    await build({
      ...config,
      entryPoints: ['background.ts', 'content.ts'].map((entryPoint) => join(srcDir, entryPoint))
    });

    await build({
      ...config,
      entryPoints: ['devtools.ts', 'panel.ts', 'sandbox.ts'].map((entryPoint) => join(srcDir, entryPoint)),
      plugins: [...config.plugins, NodeGlobalsPolyfillPlugin(), FixMemdownPlugin()]
    });
  } catch (err) {
    console.error(err);
    process.exit(-1); // Diagnostics are already printed.
  }

  await promisify(copy)(`${publicDir}/**`, distDir);
})();
