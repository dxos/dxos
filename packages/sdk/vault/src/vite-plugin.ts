//
// Copyright 2023 DXOS.org
//

import { resolve } from 'node:path';
import type { Plugin } from 'vite';

import { startVault, type StartVaultOptions } from './server';

let root: string | undefined;
export const VaultPlugin = ({ config = {} }: StartVaultOptions = {}): Plugin => ({
  name: 'dxos-vault',
  config: (config) => {
    root = config.root;
  },
  configureServer: () => {
    const configPath = root && resolve(root, config.configPath ?? 'dx.yml');
    const envPath = root && resolve(root, config.envPath ?? 'dx-env.yml');
    const devPath = root && resolve(root, config.devPath ?? 'dx-local.yml');
    void startVault({ config: { ...config, configPath, envPath, devPath } });
  },
});
