//
// Copyright 2021 DXOS.org
//

import { type Plugin } from 'esbuild';

/**
 * Replace graceful-fs with an empty module when bundling for browser.
 */
export const FixGracefulFsPlugin = (): Plugin => ({
  name: 'fix-graceful-fs-plugin',
  setup: ({ onResolve, onLoad }) => {
    onResolve({ filter: /^graceful-fs$/ }, () => ({
      path: 'graceful-fs',
      namespace: 'fix-graceful-fs-plugin',
    }));

    onLoad({ filter: /^graceful-fs$/, namespace: 'fix-graceful-fs-plugin' }, async (args) => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
  },
});
