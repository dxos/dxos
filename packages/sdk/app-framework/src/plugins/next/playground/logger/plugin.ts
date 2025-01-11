//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

import { Log } from './schema';
import { createResolver } from '../../../plugin-intent';
import { Capabilities, Events } from '../../common';
import { contributes, defineModule, lazy, definePlugin } from '../../plugin';

const Toolbar = lazy(() => import('./Toolbar'));

export const LoggerPlugin = () =>
  definePlugin({ id: 'dxos.org/test/logger' }, [
    defineModule({
      id: 'dxos.org/test/logger/intents',
      activationEvents: [Events.SetupIntents.id],
      activate: () => [
        contributes(
          Capabilities.IntentResolver,
          createResolver(Log, ({ message }) => {
            log.info(message);
          }),
        ),
      ],
    }),
    defineModule({
      id: 'dxos.org/test/logger/surfaces',
      activationEvents: [Events.Startup.id],
      activate: () => Toolbar(),
    }),
  ]);
