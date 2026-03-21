//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { meta } from '../meta';
import { ObservabilityOperation } from '../operations';

// TODO(wittjosiah): Hook up.
export const ObservabilityPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({
    activate: Capability.lazy<OperationHandlerSet.OperationHandlerSet>('OperationHandler', () =>
      Promise.resolve({
        default: Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
          Effect.fnUntraced(function* () {
            return Capability.contributes(
              Capabilities.OperationHandler,
              OperationHandlerSet.make(
                Operation.withHandler(ObservabilityOperation.SendEvent, () => Effect.void),
              ),
            );
          }),
        ),
      }),
    ),
  }),
  Plugin.make,
);
