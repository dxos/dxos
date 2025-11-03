//
// Copyright 2024 DXOS.org
//

import { type Plugin } from 'esbuild';

// Keep in sync with packages/common/node-std/src/inject-globals.js
const GLOBALS = ['global', 'Buffer', 'process'];

/**
 * Rewrite `node:` imports to `@dxos/node-std` package and mark them as external.
 */
export const NodeExternalPlugin = ({ injectGlobals = false, importGlobals = false, nodeStd = false } = {}): Plugin => ({
  name: 'node-external',
  setup: ({ initialOptions, onResolve, onLoad }) => {
    if (initialOptions.platform === 'node') {
      return;
    }

    if (importGlobals && injectGlobals) {
      if (!nodeStd) {
        throw new Error('Missing @dxos/node-std dependency.');
      }
    }

    if (importGlobals) {
      initialOptions.inject = ['@inject-globals'];
    }

    if (injectGlobals) {
      initialOptions.banner ||= {};
      initialOptions.banner.js = 'import "@dxos/node-std/globals";';
    }

    onResolve({ filter: /^@inject-globals*/ }, (args) => ({ path: '@inject-globals', namespace: 'inject-globals' }));

    onLoad({ filter: /^@inject-globals/, namespace: 'inject-globals' }, async (args) => ({
      contents: `
          export {
            ${GLOBALS.join(',\n')}
          } from '@dxos/node-std/inject-globals';
          // Empty source map so that esbuild does not inject virtual source file names.
          //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==
        `,
    }));

    onResolve({ filter: /^@dxos\/node-std\/inject-globals$/ }, (args) => ({
      external: true,
      path: '@dxos/node-std/inject-globals',
    }));

    onResolve({ filter: /^node:.*/ }, (args) => {
      if (!nodeStd) {
        return { errors: [{ text: 'Missing @dxos/node-std dependency.' }] };
      }

      const module = args.path.replace(/^node:/, '');
      return { external: true, path: `@dxos/node-std/${module}` };
    });
  },
});
