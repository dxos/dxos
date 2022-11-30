//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => {
  const dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : options.dynamic ?? false;
  assert(typeof dynamic === 'boolean', `dynamic: Expected boolean, got: ${typeof dynamic}`);

  const contents = Object.entries(definitions({ ...options, dynamic }))
    .map(([key, value]) => `globalThis.${key} = ${JSON.stringify(value)};`)
    .join('\n');

  return {
    name: 'dxos-config',
    setup: ({ onResolve, onLoad }) => {
      onLoad({ filter: /config\/dist\/lib\/browser.js/ }, async (args) => {
        const code = await readFile(args.path, 'utf-8');
        return {
          resolveDir: process.cwd(),
          contents: contents + code
        };
      });
    }
  };
};
