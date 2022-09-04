//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    include: [
      '@dxos/client',
      '@dxos/config',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-client',
      '@dxos/react-components',
      '@dxos/react-toolkit',
      '@dxos/util'
    ]
  },
  build: {
    commonjsOptions: {
      // TODO(wittjosiah): Why must org scope be omitted for this to work?
      // https://github.com/vitejs/vite/issues/5668#issuecomment-968125763
      include: [
        /client/,
        /config/,
        /protocols/,
        /react-async/,
        /react-client/,
        /react-components/,
        /react-toolkit/,
        /util/,
        /node_modules/
      ]
    }
  },
  plugins: [react(), dxosPlugin()]
});
