//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '#meta';

export const DIAGNOSTICS_DECK_COMPANION_ID = 'diagnostics';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.profile.key}.diagnosticsDeckCompanion`,
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: DIAGNOSTICS_DECK_COMPANION_ID,
              label: ['diagnostics-tab.label', { ns: meta.profile.key }],
              icon: 'ph--first-aid-kit--regular',
              data: DIAGNOSTICS_DECK_COMPANION_ID,
              position: 'last',
            }),
          ]),
      }),
    ]);
    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
