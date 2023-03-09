import { defineConfig } from 'vite';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import react from '@vitejs/plugin-react';
import { ThemePlugin } from '@dxos/react-components/plugin';
import { resolve } from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  optimizeDeps: {
    esbuildOptions: {
      // TODO(wittjosiah): Remove.
      plugins: [
        {
          name: 'yjs',
          setup: ({ onResolve }) => {
            onResolve({ filter: /yjs/ }, () => {
              return { path: require.resolve('yjs').replace('.cjs', '.mjs') };
            });
          }
        }
      ]
    }
  },
  build: {
    outDir: 'out/tasks-app-2'
  },
  plugins: [
    ConfigPlugin(),
    react(),
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, 'node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, 'node_modules/@dxos/react-components/dist/**/*.mjs')
      ]
    })
  ]
});
