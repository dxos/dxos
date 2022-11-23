//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import mdx from '@mdx-js/rollup';

// https://mdxjs.com/packages/rollup/#use
// https://mdxjs.com/docs/getting-started/#vite

// prettier-ignore
// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    react(),
    // @ts-ignore
    mdx()
  ]
});
