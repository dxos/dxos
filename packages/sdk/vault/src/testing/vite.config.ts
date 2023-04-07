//
// Copyright 2022 DXOS.org
//

import { join } from 'node:path';
import { defineConfig } from 'vite';

import { VaultPlugin } from '../vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  root: './src/testing',
  plugins: [VaultPlugin({ config: { configPath: join(__dirname, './dx.yml') } })]
});
