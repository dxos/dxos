//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { OperationResolver } from '@dxos/operation';

import { meta } from '../meta';
import { ObservabilityOperation } from '../types';

// TODO(wittjosiah): Hook up.
export const ObservabilityPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationResolverModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.OperationResolver, [
          OperationResolver.make({
            operation: ObservabilityOperation.SendEvent,
            handler: () => Effect.void,
          }),
        ]),
      ),
  }),
  Plugin.make,
);
