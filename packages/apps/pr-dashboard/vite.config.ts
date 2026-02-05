import ReactPlugin from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [ReactPlugin()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    host: true,
  },
});
