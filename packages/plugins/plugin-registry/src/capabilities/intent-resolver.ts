//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  LayoutAction,
  SettingsAction,
  contributes,
  createIntent,
  createResolver, defineCapabilityModule } from '@dxos/app-framework';

import { REGISTRY_ID } from '../meta';

export default defineCapabilityModule(() =>
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
  ));
