//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';

import { meta } from '../meta';

import { trigger } from './commands';

export const AutomationPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/cli-commands`,
    activatesOn: Events.Startup,
    activate: () => [contributes(Capabilities.Command, trigger)],
  }),
]);

