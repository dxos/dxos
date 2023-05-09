//
// Copyright 2023 DXOS.org
//

import { defineConfig } from 'vite';
import ReactPlugin from '@vitejs/plugin-react-swc';
import WebExtensionPlugin, { readJsonFile } from 'vite-plugin-web-extension';
import { resolve } from 'node:path';

function generateManifest() {
  const manifest = readJsonFile(resolve(__dirname, 'src/manifest.json'));
  const packageJson = readJsonFile(resolve(__dirname, 'package.json'));

  return {
    name: packageJson.name,
    description: packageJson.description,
    version: packageJson.version,
    ...manifest
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    ReactPlugin(),
    WebExtensionPlugin({
      manifest: generateManifest
    })
  ],
  resolve: {
    alias: {
      // In dev mode, make sure fast refresh works
      '/@react-refresh': resolve(__dirname, 'node_modules/@vitejs/plugin-react-swc/refresh-runtime.js')
    }
  }
});
