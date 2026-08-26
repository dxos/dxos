//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { Position } from '@dxos/util';

import { meta } from '#meta';

/**
 * Offers a "Neighborhood" companion on any ECHO object. The matched node is passed through as the
 * companion's `companionTo` (the active node), which the surface renders as an ego-centric graph.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'neighborhoodCompanion',
        match: AppNodeMatcher.whenEchoObjectMatches,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'neighborhood',
              label: ['neighborhood-companion.label', { ns: meta.profile.key }],
              icon: 'ph--share-network--regular',
              data: 'neighborhood',
              position: Position.last,
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
