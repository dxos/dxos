//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';

/**
 * Adds polyfills for node's built-in modules.
 */
export function NodeModulesPlugin (): Plugin {
  return {
    name: 'node-modules-plugin',
    setup ({ onResolve }) {
      onResolve({ filter: /^assert$/ }, arg => {
        return {
          path: require.resolve('assert/') // Appending slash makes node resolve the installed package from node_modules.
        };
      });
      onResolve({ filter: /^domain$/ }, arg => {
        return {
          path: require.resolve('domain-browser')
        };
      });
      onResolve({ filter: /^stream$/ }, arg => {
        return {
          path: require.resolve('readable-stream')
        };
      });
      onResolve({ filter: /^path$/ }, arg => {
        return {
          path: require.resolve('path-browserify')
        };
      });
      onResolve({ filter: /^events$/ }, arg => {
        return {
          path: require.resolve('events/')
        };
      });
      onResolve({ filter: /^util$/ }, arg => {
        return {
          path: require.resolve('util/')
        };
      });
      onResolve({ filter: /^http$/ }, arg => {
        return {
          path: require.resolve('../../polyfills/empty-module-stub.js')
        };
      });
      onResolve({ filter: /^https$/ }, arg => {
        return {
          path: require.resolve('../../polyfills/empty-module-stub.js')
        };
      });
      onResolve({ filter: /^module$/ }, arg => {
        return {
          path: require.resolve('../../polyfills/module.js')
        };
      });
      onResolve({ filter: /^crypto$/ }, arg => { // TODO
        return {
          path: require.resolve('../../polyfills/empty-module-stub.js')
        };
      });
      onResolve({ filter: /^debug$/ }, arg => {
        return {
          path: require.resolve('debug') // Resolves to installed debug module.
        };
      });
      onResolve({ filter: /^tty$/ }, arg => {
        return {
          path: require.resolve('tty-browserify')
        };
      });
      onResolve({ filter: /^fs$/ }, arg => {
        return {
          path: require.resolve('../../polyfills/empty-module-stub.js')
        };
      });
    }
  };
}
