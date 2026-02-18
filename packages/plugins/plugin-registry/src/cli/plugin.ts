//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '../meta';

import { plugin } from './commands';

export const RegistryPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCommandModule({
    commands: [plugin],
  }),
  Plugin.make,
);
