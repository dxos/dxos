//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import { plugin } from './commands';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'cli-commands',
    activatesOn: Events.Startup,
    activate: () => [Capability.contributes(Capabilities.Command, plugin)],
  }),
  Plugin.make,
);
