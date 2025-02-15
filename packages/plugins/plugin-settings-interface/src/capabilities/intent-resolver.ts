//
// Copyright 2025 DXOS.org
//

import {
  contributes,
  SettingsAction,
  createResolver,
  LayoutAction,
  Capabilities,
  type PluginsContext,
  createIntent,
} from '@dxos/app-framework';

import { SettingsInterfaceCapabilities } from './capabilities';
import { SETTINGS_ID } from '../meta';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SettingsAction.Open,
      resolve: ({ plugin }) => {
        if (plugin) {
          const state = context.requestCapability(SettingsInterfaceCapabilities.MutableState);
          state.selected = plugin;
        }

        return {
          intents: [createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: SETTINGS_ID })],
        };
      },
    }),
  );
