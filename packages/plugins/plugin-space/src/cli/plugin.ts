//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';

import { meta } from '../meta';

import { database, queue, space } from './commands';

export const SpacePlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/cli-commands`,
    activatesOn: Events.Startup,
    activate: () => [
      contributes(Capabilities.Command, database),
      contributes(Capabilities.Command, queue),
      contributes(Capabilities.Command, space),
    ],
  }),
]);
