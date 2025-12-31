//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Common from '../common';
import { Capability } from '../core';
import { createIntent, createResolver } from '../plugin-intent';

import { SETTINGS_ID, SETTINGS_KEY, SettingsAction } from './actions';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.IntentResolver,
      createResolver({
        intent: SettingsAction.Open,
        resolve: ({ plugin }) => {
          const openSettings = createIntent(Common.LayoutAction.SwitchWorkspace, {
            part: 'workspace',
            subject: SETTINGS_ID,
          });
          return {
            intents: plugin
              ? [
                  openSettings,
                  createIntent(Common.LayoutAction.Open, {
                    part: 'main',
                    subject: [`${SETTINGS_KEY}:${plugin.replaceAll('/', ':')}`],
                  }),
                ]
              : [openSettings],
          };
        },
      }),
    ),
  ),
);
