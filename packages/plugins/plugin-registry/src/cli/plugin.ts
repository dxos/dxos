//
// Copyright 2025 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';

import { meta } from '../meta';

import { plugin } from './commands';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addCommandModule({
    commands: [plugin],
  }),
  Plugin.make,
);
