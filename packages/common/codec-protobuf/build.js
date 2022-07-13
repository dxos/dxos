//
// Copyright 2022 DXOS.org
//

const { build } = require('esbuild');

build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'cjs',
  write: true,
  bundle: true
});
