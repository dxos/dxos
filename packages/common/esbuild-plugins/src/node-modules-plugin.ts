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
    onResolve({ filter: /^(node:)?assert$/ }, (arg) => ({
      path: require.resolve('assert/'), // Appending slash makes node resolve the installed package from node_modules.
    }));
    onResolve({ filter: /^(node:)?buffer$/ }, (arg) => ({
      path: require.resolve('../../polyfills/Buffer.js'),
    }));
    onResolve({ filter: /^(node:)?domain$/ }, (arg) => ({
      path: require.resolve('domain-browser'),
    }));
    onResolve({ filter: /^(node:)?stream$/ }, (arg) => ({
      path: require.resolve('readable-stream'),
    }));
    onResolve({ filter: /^(node:)?path$/ }, (arg) => ({
      path: require.resolve('path-browserify'),
    }));
    onResolve({ filter: /^(node:)?events$/ }, (arg) => ({
      path: require.resolve('events/'),
    }));
    onResolve({ filter: /^(node:)?util$/ }, (arg) => ({
      path: require.resolve('util/'),
    }));
    onResolve({ filter: /^(node:)?http$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?https$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?module$/ }, (arg) => ({
      path: require.resolve('../../polyfills/module.js'),
    }));
    onResolve({ filter: /^(node:)?crypto$/ }, (arg) => ({
      path: require.resolve('../../polyfills/crypto.js'),
    }));
    onResolve({ filter: /^(node:)?debug$/ }, (arg) => ({
      path: require.resolve('debug/'), // Resolves to installed debug module.
    }));
    onResolve({ filter: /^(node:)?tty$/ }, (arg) => ({
      path: require.resolve('tty-browserify'),
    }));
    onResolve({ filter: /^(node:)?fs$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?child_process$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?fs\/promises$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?os$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?net$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?tls$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?zlib$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?dns$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?constants$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?inspector$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?readline$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^yargs/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?url$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
    onResolve({ filter: /^(node:)?querystring$/ }, (arg) => ({
      path: require.resolve('../../polyfills/empty-module-stub.js'),
    }));
  },
});
