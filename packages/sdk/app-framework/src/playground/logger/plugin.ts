//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

import { Capabilities, Events } from '../../common';
import { contributes, defineModule, definePlugin, lazy } from '../../core';
import { createResolver } from '../../plugin-intent';

import { Log } from './schema';

const Toolbar = lazy(() => import('./Toolbar'));

const meta = {
  id: 'dxos.org/test/logger',
  name: 'Logger',
};

export const LoggerPlugin = definePlugin(meta, () => [
  defineModule({
    id: 'dxos.org/test/logger/intents',
    activatesOn: Events.SetupIntentResolver,
    activate: () => [
      contributes(
        Capabilities.IntentResolver,
        createResolver({
          intent: Log,
          resolve: ({ message }) => {
            log.info(message);
          },
        }),
      ),
    ],
  }),
  defineModule({
    id: 'dxos.org/test/logger/surfaces',
    activatesOn: Events.Startup,
    activate: Toolbar,
  }),
]);
