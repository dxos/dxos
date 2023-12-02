//
// Copyright 2022 DXOS.org
//

import { type Plugin } from 'rollup';

import { definitions } from './definitions';
import { type ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => {
  const contents = Object.entries(definitions({ ...options, mode: process.env.NODE_ENV }))
    .map(([key, value]) => `globalThis.${key} = ${JSON.stringify(value)};`)
    .join('\n');

  return {
    name: 'dxos-config',
    banner: contents,
  };
};
