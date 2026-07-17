//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/compute';

import { meta } from '#meta';
import { ObservabilityOperation } from '#types';

// TODO(wittjosiah): Hook up.
export const ObservabilityPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({
    id: 'OperationHandler',
    requires: [],
    provides: [Capabilities.OperationHandler],
    activate: () =>
      Effect.succeed([
        Capability.provide(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(ObservabilityOperation.SendEvent, () => Effect.void)),
        ),
      ]),
  }),
  Plugin.make,
);

export default ObservabilityPlugin;
