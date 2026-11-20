//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'bundler': 'src/bundler/index.ts',
    'index': 'src/index.ts',
    'native': 'src/native/index.ts',
    'plugin-loader': 'src/plugin-loader/index.ts',
    'host-process-manager': 'src/HostProcessManager.ts',
    'process-control': 'src/EdgeProcessControl.ts',
    'testing': 'src/testing/index.ts',
  },
  assetsAsFiles: true,
  test: { node: true },
});
