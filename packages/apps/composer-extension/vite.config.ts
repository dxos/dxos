//
// Copyright 2023 DXOS.org
//

import { defineConfig } from 'vite';
import WebExtensionPlugin, { readJsonFile } from 'vite-plugin-web-extension';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const generateManifest = () => {
  const manifest = readJsonFile(resolve(__dirname, 'src/manifest.json'));
  const packageJson = readJsonFile(resolve(__dirname, 'package.json'));

  return {
    name: 'DXOS Composer',
    author: 'DXOS.org',
    description: packageJson.description,
    version: packageJson.version,
    ...manifest
  };
};

// This is needed because web-ext fails to recursively create the directory.
mkdirSync(resolve(__dirname, '.profiles/chromium'), { recursive: true });
mkdirSync(resolve(__dirname, '.profiles/firefox'), { recursive: true });

// https://vitejs.dev/config
export default defineConfig({
  build:{
    outDir: 'out/composer-extension'
  },
  plugins: [
    // https://vite-plugin-web-extension.aklinker1.io/config/plugin-options.html
    WebExtensionPlugin({
      browser: process.env.TARGET,
      manifest: generateManifest,
      // https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
      webExtConfig: {
        browserConsole: true,
        startUrl: [process.env.OPEN_URL ?? 'https://github.com/dxos/dxos/issues/99'],
        profileCreateIfMissing: true,
        keepProfileChanges: true,
        chromiumProfile: '.profiles/chromium',
        firefoxProfile: '.profiles/firefox'
      }
    })
  ]
});
