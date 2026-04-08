//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}.help`,
        match: NodeMatcher.whenRoot,
        connector: (node) =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: linkedSegment('help'),
              label: ['help.label', { ns: meta.id }],
              icon: 'ph--question--regular',
              data: null,
              position: 'hoist',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
