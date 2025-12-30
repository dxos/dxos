//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin, createResolver } from '@dxos/app-framework';

import { meta } from '../meta';
import { ObservabilityAction } from '../types';

// TODO(wittjosiah): Hook up.
export const ObservabilityPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: () =>
      Effect.succeed(
        Capability.contributes(
          Common.Capability.IntentResolver,
          createResolver({
            intent: ObservabilityAction.SendEvent,
            resolve: () => {},
          }),
        ),
      ),
  }),
  Plugin.make,
);
