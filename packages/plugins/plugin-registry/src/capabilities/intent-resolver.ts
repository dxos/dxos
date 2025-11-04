//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  LayoutAction,
  SettingsAction,
  contributes,
  createIntent,
  createResolver,
} from '@dxos/app-framework';

import { REGISTRY_ID } from '../meta';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SettingsAction.OpenPluginRegistry,
      resolve: () => ({
        intents: [createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: REGISTRY_ID })],
      }),
    }),
  );
