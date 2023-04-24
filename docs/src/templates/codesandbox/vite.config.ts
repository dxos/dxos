//
// Copyright 2022 DXOS.org
//

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VaultPlugin } from '@dxos/vault/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VaultPlugin()],
});
