//
// Copyright 2022 DXOS.org
//

import { join } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

import { VaultPlugin } from '../vite-plugin';

// https://vitejs.dev/config
export default defineConfig({
  root: './src/testing',
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd())
      ]
    }
  },
  plugins: [VaultPlugin({ config: { configPath: join(__dirname, './dx.yml') } })]
});
