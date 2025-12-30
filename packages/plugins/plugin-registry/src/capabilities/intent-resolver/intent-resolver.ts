//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, SettingsAction, createIntent, createResolver } from '@dxos/app-framework';

import { REGISTRY_ID } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
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
  ),
);
