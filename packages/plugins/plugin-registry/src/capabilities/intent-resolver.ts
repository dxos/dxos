//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  Capability,
  LayoutAction,
  SettingsAction,
  createIntent,
  createResolver,
} from '@dxos/app-framework';

import { REGISTRY_ID } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SettingsAction.OpenPluginRegistry,
      resolve: () => {
        return {
          intents: [createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: REGISTRY_ID })],
        };
      },
    }),
  ),
);
