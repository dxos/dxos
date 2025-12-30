//
// Copyright 2025 DXOS.org
//

import * as Common from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';

const IntentDispatcher = Capability.lazy('IntentDispatcher', () => import('./intent-dispatcher'));

export const IntentPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    // TODO(wittjosiah): This will mean that startup needs to be reset when intents are added or removed.
    //   This is fine for now because it's how it worked prior to capabilities api anyways.
    //   In the future, the intent dispatcher should be able to be reset without resetting the entire app.
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.DispatcherReady],
    activate: IntentDispatcher,
  }),
  Plugin.make,
);
