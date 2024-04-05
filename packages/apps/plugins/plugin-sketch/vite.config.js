//
// Copyright 2024 DXOS.org
//

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

// NODE_OPTIONS="--trace-warnings" p test

// https://vitejs.dev/config
export default defineConfig({
  // browser: {
  //   enabled: true,
  // },
  test: {
    global: true,
    environment: 'jsdom',
    include: ['**/*.spec.ts'],
  },
  plugins: [react()],
});
