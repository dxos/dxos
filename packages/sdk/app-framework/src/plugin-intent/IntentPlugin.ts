//
// Copyright 2025 DXOS.org
//

import { Events } from '../common';
import { defineModule, definePlugin, lazy } from '../core';

import { INTENT_PLUGIN } from './actions';

export const IntentPlugin = () =>
  definePlugin({ id: INTENT_PLUGIN, name: 'Intent' }, [
    defineModule({
      id: `${INTENT_PLUGIN}/module/dispatcher`,
      // TODO(wittjosiah): This will mean that startup needs to be reset when intents are added or removed.
      //   This is fine for now because it's how it worked prior to capabilities api anyways.
      //   In the future, the intent dispatcher should be able to be reset without resetting the entire app.
      activatesOn: Events.Startup,
      activatesAfter: [Events.DispatcherReady],
      activate: lazy(() => import('./intent-dispatcher')),
    }),
  ]);
