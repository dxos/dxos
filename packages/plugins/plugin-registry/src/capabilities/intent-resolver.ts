//
// Copyright 2025 DXOS.org
//

import {
  contributes,
  SettingsAction,
  createResolver,
  LayoutAction,
  Capabilities,
  createIntent,
} from '@dxos/app-framework';

import { REGISTRY_ID } from '../meta';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SettingsAction.OpenPluginRegistry,
      resolve: () => {
        return {
          intents: [createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: REGISTRY_ID })],
        };
      },
    }),
  );
