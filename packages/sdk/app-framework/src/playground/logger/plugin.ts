//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';
import { OperationResolver } from '@dxos/operation';

import * as Common from '../../common';
import { Capability, Plugin } from '../../core';

import { LogOperation } from './schema';

const Toolbar = Capability.lazy('Toolbar', () => import('./Toolbar'));

const meta = {
  id: 'dxos.org/test/logger',
  name: 'Logger',
};

export const LoggerPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addOperationResolverModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(Common.Capability.OperationResolver, [
          OperationResolver.make({
            operation: LogOperation,
            handler: ({ message }) =>
              Effect.sync(() => {
                log.info(message);
              }),
          }),
        ]),
      ),
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: Toolbar,
  }),
  Plugin.make,
);
