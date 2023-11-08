import { defineConfig } from 'vite';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  build: {
    outDir: 'out/tasks',
  },
  plugins: [ConfigPlugin(), react({ jsxRuntime: 'classic' })],
});
