import { defineConfig } from 'vite'
import { NodeGlobalsPolyfillPlugin } from '@dxos/esbuild-plugins';
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['@dxos/client'],
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin()
      ]
    }
  },
  build: {
    commonjsOptions: {
      include: [/@dxos\/*/, /node_modules/]
    }
  },
  plugins: [react()]
})
