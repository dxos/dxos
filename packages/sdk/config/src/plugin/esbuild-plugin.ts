//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => {
  const dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : options.dynamic ?? false;

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
