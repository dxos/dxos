//
// Copyright 2025 DXOS.org
//

import { Capability, Common, SettingsAction, createIntent, createResolver } from '@dxos/app-framework';

import { REGISTRY_ID } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(
    Common.Capability.IntentResolver,
    createResolver({
      intent: SettingsAction.OpenPluginRegistry,
      resolve: () => {
        return {
          intents: [createIntent(Common.LayoutAction.SwitchWorkspace, { part: 'workspace', subject: REGISTRY_ID })],
        };
      },
    }),
  ),
);
