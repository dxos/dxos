//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { OperationResolver } from '@dxos/operation';

import { AppPlugin } from '../../plugin';

import { LogOperation } from './schema';

const Toolbar = Capability.lazy('Toolbar', () => import('./Toolbar'));

const meta = {
  id: 'dxos.org/test/logger',
  name: 'Logger',
};

export const LoggerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationResolverModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.OperationResolver, [
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
    activatesOn: ActivationEvents.Startup,
    activate: Toolbar,
  }),
  Plugin.make,
);
