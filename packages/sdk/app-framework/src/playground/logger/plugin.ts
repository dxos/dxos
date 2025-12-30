//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import * as Common from '../../common';
import { Capability, Plugin } from '../../core';
import { createResolver } from '../../plugin-intent';

import { Log } from './schema';

const Toolbar = Capability.lazy('Toolbar', () => import('./Toolbar'));

const meta = {
  id: 'dxos.org/test/logger',
  name: 'Logger',
};

export const LoggerPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addIntentResolverModule({
    activate: () =>
      Effect.succeed([
        Capability.contributes(
          Common.Capability.IntentResolver,
          createResolver({
            intent: Log,
            resolve: ({ message }) => {
              log.info(message);
            },
          }),
        ),
      ]),
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: Toolbar,
  }),
  Plugin.make,
);
