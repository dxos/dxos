//
// Copyright 2025 DXOS.org
//

import { Common, Plugin, Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import { integration } from './commands';

export const TokenManagerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'cli-commands',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => [Capability.contributes(Common.Capability.Command, integration)],
  }),
  Plugin.make,
);
