//
// Copyright 2022 DXOS.org
//

// This script is used to test whether the esbuild config plugin is properly injecting config constants.
// TODO(wittjosiah): Automate this test.

const { build } = require('esbuild');
const { join, resolve } = require('node:path');

const { themePlugins } = require('@dxos/react-ui/esbuild-plugin');

// eslint-disable-next-line
// @ts-ignore
// const { ConfigPlugin } = require('../dist/plugin/node/esbuild-plugin');

void build({
  entryPoints: [join(__dirname, '../src/index.ts'), resolve(__dirname, '../node_modules/@dxos/react-ui/src/theme.css')],
  outdir: join(__dirname, '../dist'),
  write: true,
  bundle: true,
  external: ['*.woff2'],
  plugins: themePlugins({
    outdir: resolve(__dirname, '../dist'),
    content: [
      resolve(__dirname, '../index.html'),
      resolve(__dirname, '../src/**/*.{js,ts,jsx,tsx}'),
      resolve(__dirname, '../node_modules/@dxos/react-ui/dist/**/*.mjs')
    ]
  })
});
