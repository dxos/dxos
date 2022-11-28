//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';
import { resolve } from 'path';

/**
 * Injects node globals such as `Buffer` or `process`.
 */
export const NodeGlobalsPolyfillPlugin = (): Plugin => ({
  name: 'node-globals-polyfill',
  setup: ({ initialOptions }) => {
    const polyfills = [
      // TODO: Use `buffer` module from NPM.
      resolve(__dirname, '../../polyfills/process.js'),
      resolve(__dirname, '../../polyfills/Buffer.js')
    ];
    if (initialOptions.inject) {
      initialOptions.inject.push(...polyfills);
    } else {
      initialOptions.inject = [...polyfills];
    }
  }
});
