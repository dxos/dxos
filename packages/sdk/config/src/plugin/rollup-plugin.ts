//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { Plugin } from 'rollup';

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
    banner: contents
  };
};
