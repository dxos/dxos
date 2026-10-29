//
// Copyright 2026 DXOS.org
//

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { ThemePlugin } from '@dxos/ui-theme/plugin';

export default defineConfig({
  plugins: [ThemePlugin({}), react()],
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  build: { outDir: 'dist/client', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
