//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { LogOperation } from './schema';

const Toolbar = Capability.lazyModule('Toolbar', { provides: [Capabilities.ReactSurface] }, () => import('./Toolbar'));

const OperationHandler = Capability.inlineModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () =>
    Effect.succeed([
      Capability.contribute(
        Capabilities.OperationHandler,
        OperationHandlerSet.make(
          Operation.withHandler(LogOperation, ({ message }) =>
            Effect.sync(() => {
              log.info(message);
            }),
          ),
        ),
      ),
    ]),
);

const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.test.logger'),
  name: 'Logger',
});

export const LoggerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Toolbar),
  Plugin.make,
);
