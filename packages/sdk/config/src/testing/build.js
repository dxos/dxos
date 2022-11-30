//
// Copyright 2022 DXOS.org
//

const { build } = require('esbuild');
const { join } = require('node:path');

const { ConfigPlugin } = require('../../dist/plugin/node/esbuild-plugin');

void build({
  entryPoints: [join(__dirname, './entry.js')],
  outdir: join(__dirname, '../../out'),
  write: true,
  bundle: true,
  plugins: [ConfigPlugin()]
});
