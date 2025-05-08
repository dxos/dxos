//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { SETTINGS_ID, SETTINGS_KEY, SettingsAction } from './actions';
import { Capabilities, LayoutAction } from '../common';
import { contributes } from '../core';
import { createResolver, createIntent, chain } from '../plugin-intent';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SettingsAction.Open,
      resolve: ({ plugin }) => {
        const openSettings = createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: SETTINGS_ID });
        return {
          intents: [
            plugin
              ? pipe(
                  openSettings,
                  chain(LayoutAction.Open, {
                    part: 'main',
                    subject: [`${SETTINGS_KEY}:${plugin.replaceAll('/', ':')}`],
                  }),
                )
              : openSettings,
          ],
        };
      },
    }),
  );
