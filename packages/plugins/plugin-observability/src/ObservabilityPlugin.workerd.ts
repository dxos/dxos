//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Operation, OperationHandlerSet } from '@dxos/compute';

import { meta } from '#meta';
import { ObservabilityOperation } from '#types';

export const ObservabilityPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(
    Capability.inlineModule('OperationHandler', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([
        Capability.provide(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(ObservabilityOperation.SendEvent, () => Effect.void)),
        ),
      ]),
    ),
  ),
  Plugin.make,
);

export default ObservabilityPlugin;
