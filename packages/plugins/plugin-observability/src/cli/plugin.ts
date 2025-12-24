//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, createResolver, defineModule, definePlugin } from '@dxos/app-framework';

import { meta } from '../meta';
import { ObservabilityAction } from '../types';

// TODO(wittjosiah): Hook up.
export const ObservabilityPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: () =>
      contributes(
        Capabilities.IntentResolver,
        createResolver({
          intent: ObservabilityAction.SendEvent,
          resolve: () => {},
        }),
      ),
  }),
]);
