import { defineConfig } from 'vite';
import { dxosPlugin } from '@dxos/vite-plugin';
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  optimizeDeps: {
  force: true,
  include: [
    '@dxos/client',
    '@dxos/react-client',
    '@dxos/config'
  ],
  esbuildOptions: {
    // TODO(wittjosiah): Remove.
    plugins: [
      {
        name: 'yjs',
        setup: ({ onResolve }) => {
          onResolve({ filter: /yjs/ }, () => {
            return { path: require.resolve('yjs').replace('.cjs', '.mjs') }
          })
        }
      }
    ]
  }
},
build: {
  outDir: 'out/app/@dxos/hello',
  commonjsOptions: {
    include: [
      /packages/,
      /node_modules/
    ]
  }
},
  plugins: [
    react(),
    dxosPlugin(__dirname)
  ]
});