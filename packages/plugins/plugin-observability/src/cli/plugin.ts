//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver, Plugin } from '@dxos/app-framework';

import { meta } from '../meta';
import { ObservabilityOperation } from '../types';

// TODO(wittjosiah): Hook up.
export const ObservabilityPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addOperationResolverModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(Common.Capability.OperationResolver, [
          OperationResolver.make({
            operation: ObservabilityOperation.SendEvent,
            handler: () => Effect.void,
          }),
        ]),
      ),
  }),
  Plugin.make,
);
