//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';
import assert from 'node:assert';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

// TODO(wittjosiah): Test config plugin properly injects config when used with loaders.
export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => {
  const dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : (options.dynamic ?? false);
  assert(typeof dynamic === 'boolean', `dynamic: Expected boolean, got: ${typeof dynamic}`);

  return {
    name: 'dxos-config',
    setup: ({ onResolve, onLoad }) => {
      onResolve(
        { filter: /loaders$/ },
        args => ({ path: require.resolve('./loaders/browser-esbuild', { paths: [args.resolveDir] }) })
      );

      onResolve(
        { filter: /^dxos-config-globals$/ },
        () => ({ path: 'dxos-config-globals', namespace: 'dxos-config' })
      );

      onLoad({ filter: /^dxos-config-globals$/, namespace: 'dxos-config' }, () => ({
        resolveDir: process.cwd(),
        contents: Object.entries(definitions({ ...options, dynamic }))
          .map(([key, value]) => `globalThis.${key} = ${JSON.stringify(value)};`)
          .join('\n')
      }));
    }
  };
};
