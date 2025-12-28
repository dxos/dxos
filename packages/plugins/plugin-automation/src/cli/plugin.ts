//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import { trigger } from './commands';

export const AutomationPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'cli-commands',
    activatesOn: Events.Startup,
    activate: () => [Capability.contributes(Capabilities.Command, trigger)],
  }),
  Plugin.make,
);
