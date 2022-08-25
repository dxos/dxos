//
// Copyright 2022 DXOS.org
//

import { build } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

void build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/browser.js',
  format: 'cjs',
  write: true,
  bundle: true,
  plugins: [
    // Only include protobufjs in the package bundle.
    nodeExternalsPlugin({ allowList: ['protobufjs'] })
  ]
});
