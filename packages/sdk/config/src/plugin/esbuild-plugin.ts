//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';
import assert from 'node:assert';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

// TODO(wittjosiah): Test config plugin properly injects config when used with loaders.
export const ConfigPlugin = ({ dynamic = false, publicUrl = '' }: ConfigPluginOpts = {}): Plugin => {
  dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : dynamic;
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
        contents: Object.entries(definitions({ dynamic, publicUrl })).map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`).join('\n')
      }));
    }
  };
};
