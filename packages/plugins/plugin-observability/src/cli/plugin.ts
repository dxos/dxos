//
// Copyright 2025 DXOS.org
//

import { Common, Plugin, Capability, createResolver } from '@dxos/app-framework';

import { meta } from '../meta';
import { ObservabilityAction } from '../types';

// TODO(wittjosiah): Hook up.
export const ObservabilityPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: () =>
      Capability.contributes(
        Common.Capability.IntentResolver,
        createResolver({
          intent: ObservabilityAction.SendEvent,
          resolve: () => {},
        }),
      ),
  }),
  Plugin.make,
);
