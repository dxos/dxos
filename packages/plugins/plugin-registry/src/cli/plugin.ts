//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';

import { meta } from '../meta';

import { plugin } from './commands';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'cli-commands',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => [Capability.contributes(Common.Capability.Command, plugin)],
  }),
  Plugin.make,
);
