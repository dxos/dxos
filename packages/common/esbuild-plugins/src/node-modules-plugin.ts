//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';

/**
 * Adds polyfills for node's built-in modules.
 */
export const NodeModulesPlugin = (): Plugin => ({
  name: 'node-modules-plugin',
  setup: ({ onResolve }) => {
    onResolve({ filter: /^(node:)?assert$/ }, (arg) => {
      return {
        path: require.resolve('assert/'), // Appending slash makes node resolve the installed package from node_modules.
      };
    });
    onResolve({ filter: /^(node:)?buffer$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/Buffer.js'),
      };
    });
    onResolve({ filter: /^(node:)?domain$/ }, (arg) => {
      return {
        path: require.resolve('domain-browser'),
      };
    });
    onResolve({ filter: /^(node:)?stream$/ }, (arg) => {
      return {
        path: require.resolve('readable-stream'),
      };
    });
    onResolve({ filter: /^(node:)?path$/ }, (arg) => {
      return {
        path: require.resolve('path-browserify'),
      };
    });
    onResolve({ filter: /^(node:)?events$/ }, (arg) => {
      return {
        path: require.resolve('events/'),
      };
    });
    onResolve({ filter: /^(node:)?util$/ }, (arg) => {
      return {
        path: require.resolve('util/'),
      };
    });
    onResolve({ filter: /^(node:)?http$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?https$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?module$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/module.js'),
      };
    });
    onResolve({ filter: /^(node:)?crypto$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/crypto.js'),
      };
    });
    onResolve({ filter: /^(node:)?debug$/ }, (arg) => {
      return {
        path: require.resolve('debug/'), // Resolves to installed debug module.
      };
    });
    onResolve({ filter: /^(node:)?tty$/ }, (arg) => {
      return {
        path: require.resolve('tty-browserify'),
      };
    });
    onResolve({ filter: /^(node:)?fs$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?child_process$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?fs\/promises$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?os$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?net$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?tls$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?zlib$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?dns$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?constants$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?inspector$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?readline$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^yargs/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?url$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
    onResolve({ filter: /^(node:)?querystring$/ }, (arg) => {
      return {
        path: require.resolve('../../polyfills/empty-module-stub.js'),
      };
    });
  },
});
