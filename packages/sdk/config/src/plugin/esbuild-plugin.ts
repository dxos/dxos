//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';
import assert from 'node:assert';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => {
  const dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : options.dynamic ?? false;
  assert(typeof dynamic === 'boolean', `dynamic: Expected boolean, got: ${typeof dynamic}`);

  return {
    name: 'dxos-config',
    setup: ({ initialOptions }) => {
      const esbuildOptions = initialOptions;
      esbuildOptions.define ||= {};

      Object.entries(definitions({ ...options, dynamic })).reduce((define, [key, value]) => {
        define[key] = JSON.stringify(value);
        return define;
      }, esbuildOptions.define);
    }
  };
};
