//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../../vitest.shared';

export default mergeConfig(baseConfig({ cwd: __dirname }), defineConfig({
  test: {
    // TODO(burdon): [vite] Pre-transform error: "ESM integration proposal for Wasm" is not supported currently.
    exclude: ['**/transcriber.test.ts'],
    // environment: 'jsdom',
    // globals: true,
    // deps: {
    //   inline: [/\/node_modules\//]
    // },
    // // Enable this if you need to test Worker functionality.
    // browser: {
    //   enabled: true,
    //   name: 'chrome',
    // }
  }
}));
