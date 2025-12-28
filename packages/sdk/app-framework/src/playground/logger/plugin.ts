//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

import { Capabilities, Events } from '../../common';
import { Capability, Plugin } from '../../core';
import { createResolver } from '../../plugin-intent';

import { Log } from './schema';

const Toolbar = Capability.lazy('Toolbar', () => import('./Toolbar'));

const meta = {
  id: 'dxos.org/test/logger',
  name: 'Logger',
};

export const LoggerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'intents',
    activatesOn: Events.SetupIntentResolver,
    activate: () => [
      Capability.contributes(
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
  Plugin.addModule({
    activatesOn: Events.Startup,
    activate: Toolbar,
  }),
  Plugin.make,
);
