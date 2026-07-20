//
// Copyright 2024 DXOS.org
//

import { defineConfig } from '{{ workspace_root | path_join(part = 'vite.base.config.ts') | path_relative(from = dest_dir) }}';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  test: { node: true },
});
