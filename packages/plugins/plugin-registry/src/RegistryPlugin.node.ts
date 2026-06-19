//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';

import { plugin, registry } from './commands';

export const RegistryPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCommandModule({
    commands: [plugin, registry],
  }),
  Plugin.make,
);

export default RegistryPlugin;
