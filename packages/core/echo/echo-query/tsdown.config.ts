//
// Copyright 2025 DXOS.org
//

import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/query-lite/index.ts',
  outDir: 'dist/query-lite',
  platform: 'browser',
  silent: true,
  dts: {
    resolve: true,
  },
  external: ['protobufjs', '@dxos/log'],
  noExternal: ['@dxos/invariant'],
});
