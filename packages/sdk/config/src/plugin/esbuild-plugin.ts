//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';

import { definitions } from './definitions';
import { type ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => ({
  name: 'dxos-config',
  setup: ({ initialOptions }) => {
    const esbuildOptions = initialOptions;
    esbuildOptions.define ||= {};

    Object.entries(definitions({ ...options, mode: process.env.NODE_ENV })).reduce((define, [key, value]) => {
      define[key] = JSON.stringify(value);
      return define;
    }, esbuildOptions.define);
  },
});
