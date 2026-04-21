//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client/types';

import { LayerSpecs } from '#capabilities';
import { meta } from '#meta';

import { trigger } from './commands';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCommandModule({ commands: [trigger] }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [ActivationEvents.SetupLayer],
    activate: LayerSpecs,
  }),
  Plugin.make,
);
