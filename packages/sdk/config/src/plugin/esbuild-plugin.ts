//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => {
  return {
    name: 'dxos-config',
    setup: ({ initialOptions }) => {
      const esbuildOptions = initialOptions;
      esbuildOptions.define ||= {};

      Object.entries(definitions(options)).reduce((define, [key, value]) => {
        define[key] = JSON.stringify(value);
        return define;
      }, esbuildOptions.define);
    }
  };
};
