//
// Copyright 2025 DXOS.org
//

import { Events } from '../common';
import { defineModule, definePlugin, lazy } from '../core';

import { meta } from './meta';

export const IntentPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/dispatcher`,
    // TODO(wittjosiah): This will mean that startup needs to be reset when intents are added or removed.
    //   This is fine for now because it's how it worked prior to capabilities api anyways.
    //   In the future, the intent dispatcher should be able to be reset without resetting the entire app.
    activatesOn: Events.Startup,
    activatesAfter: [Events.DispatcherReady],
    activate: lazy(() => import('./intent-dispatcher')),
  }),
]);
