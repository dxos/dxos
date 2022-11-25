//
// Copyright 2022 DXOS.org
//

import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// prettier-ignore
// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    // @ts-ignore
    mdx(),
    react()
  ]
});
