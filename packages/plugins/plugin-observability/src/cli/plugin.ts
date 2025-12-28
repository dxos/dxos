//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, Plugin, Capability, createResolver } from '@dxos/app-framework';

import { meta } from '../meta';
import { ObservabilityAction } from '../types';

// TODO(wittjosiah): Hook up.
export const ObservabilityPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: () =>
      Capability.contributes(
        Capabilities.IntentResolver,
        createResolver({
          intent: ObservabilityAction.SendEvent,
          resolve: () => {},
        }),
      ),
  }),
  Plugin.make,
);
