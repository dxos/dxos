//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'deck-companion',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'slack',
              label: ['plugin.name', { ns: meta.id }],
              icon: meta.icon ?? 'ph--slack-logo--regular',
              data: 'slack',
              position: 'fallback',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
