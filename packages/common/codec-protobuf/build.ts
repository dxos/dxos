//
// Copyright 2022 DXOS.org
//

import { build } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'cjs',
  write: true,
  bundle: true,
  plugins: [
    // Only include protobufjs in the package bundle.
    nodeExternalsPlugin({ allowList: ['protobufjs'] })
  ]
});
