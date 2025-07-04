//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import { type Plugin } from 'vite';

import { definitions } from './definitions';
import { type ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => ({
  name: 'dxos-config',
  config: () => {
    // Update paths.
    const configPath = options.root && resolve(options.root, options.configPath ?? 'dx.yml');
    const envPath = options.root && resolve(options.root, options.envPath ?? 'dx-env.yml');
    // TODO(burdon): Change to dx-dev.yml?
    const devPath = options.root && resolve(options.root, options.devPath ?? 'dx-local.yml');

    const define = Object.entries(definitions({ ...options, configPath, envPath, devPath })).reduce(
      (define, [key, value]) => {
        define[key] = JSON.stringify(value);
        return define;
      },
      {} as { [key: string]: string },
    );

    return { define };
  },
});
