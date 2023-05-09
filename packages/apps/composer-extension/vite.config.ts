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
    // https://vite-plugin-web-extension.aklinker1.io/config/plugin-options.html
    WebExtensionPlugin({
      browser: process.env.TARGET,
      manifest: generateManifest,
      webExtConfig: {
        startUrl: [process.env.OPEN_URL ?? 'https://github.com/dxos/dxos/issues/99']
      }
    })
  ],
  resolve: {
    alias: {
      // In dev mode, make sure fast refresh works
      '/@react-refresh': resolve(__dirname, 'node_modules/@vitejs/plugin-react-swc/refresh-runtime.js')
    }
  }
});
