//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import type { Plugin } from 'vite';

import { log } from '@dxos/log';

import { definitions } from './definitions';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => ({
  name: 'dxos-config',
  config: ({ root }) => {
    const dynamic = process.env.CONFIG_DYNAMIC === 'true' ? true : options.dynamic ?? false;
    const configPath = root && resolve(root, options.configPath ?? 'dx.yml');
    const envPath = root && resolve(root, options.envPath ?? 'dx-env.yml');
    const devPath = root && resolve(root, options.devPath ?? 'dx-dev.yml');
    const define = Object.entries(definitions({ ...options, dynamic, configPath, envPath, devPath })).reduce(
      (define, [key, value]) => {
        define[key] = JSON.stringify(value);
        return define;
      },
      {} as { [key: string]: string },
    );

    log.info('Open this app from DX CLI:\n   $ dx app open <app url here>');

    return { define };
  },
});
