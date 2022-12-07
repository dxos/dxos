//
// Copyright 2022 DXOS.org
//

import alias from '@rollup/plugin-alias';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}) => {
  const entries = Object.entries(definitions(options)).map(([find, replacement]) => ({
    find,
    replacement: JSON.stringify(replacement)
  }));

  const plugin = alias({ entries });
  plugin.name = 'dxos-config';

  return plugin;
};
