//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

import { Log } from './schema';
import { Capabilities, Events } from '../../common';
import { contributes, defineModule, lazy, definePlugin } from '../../core';
import { createResolver } from '../../plugin-intent';

const Toolbar = lazy(() => import('./Toolbar'));

export const LoggerPlugin = () =>
  definePlugin({ id: 'dxos.org/test/logger', name: 'Logger' }, [
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
