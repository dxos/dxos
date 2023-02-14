//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import type { Plugin } from 'vite';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => ({
  name: 'dxos-config',
  config: ({ root }) => {
    const configPath = root && resolve(root, options.configPath ?? 'dx.yml');
    const envPath = root && resolve(root, options.envPath ?? 'dx-env.yml');
    const devPath = root && resolve(root, options.devPath ?? 'dx-dev.yml');
    const define = Object.entries(definitions({ ...options, configPath, envPath, devPath })).reduce(
      (define, [key, value]) => {
        define[key] = JSON.stringify(value);
        return define;
      },
      {} as { [key: string]: string }
    );

    return { define };
  }
});
