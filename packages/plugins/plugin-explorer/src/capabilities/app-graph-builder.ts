//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Position } from '@dxos/util';

import { meta } from '#meta';

/**
 * Offers a "Neighborhood" companion on any ECHO object. The matched node is passed through as the
 * companion's `companionTo` (the active node), which the surface renders as an ego-centric graph.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'neighborhoodCompanion',
        match: NodeMatcher.whenEchoObjectMatches,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('neighborhood'),
              label: ['neighborhood-companion.label', { ns: meta.profile.key }],
              icon: 'ph--share-network--regular',
              data: 'neighborhood',
              position: Position.last,
            }),
          ]),
      }),
    ]);

    return [Capability.provide(AppCapabilities.AppGraphBuilder, extensions)];
  }),
);
