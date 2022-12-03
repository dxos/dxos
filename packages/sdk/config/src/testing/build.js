//
// Copyright 2022 DXOS.org
//

// This script is used to test whether the esbuild config plugin is properly injecting config constants.
// TODO(wittjosiah): Automate this test.

const { build } = require('esbuild');
const { join } = require('node:path');

// eslint-disable-next-line
// @ts-ignore
const { ConfigPlugin } = require('../../dist/plugin/node/esbuild-plugin');

void build({
  entryPoints: [join(__dirname, './entry.js')],
  outdir: join(__dirname, '../../out'),
  write: true,
  bundle: true,
  plugins: [ConfigPlugin()]
});
