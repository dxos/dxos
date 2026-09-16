//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphNode from '@dxos/graph/GraphNode';

import { DeckCapabilities } from '#types';

import { evictableWorkspaces } from '../util/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = yield* DeckCapabilities.State;
    const layoutAtom = yield* AppCapabilities.Layout;
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);

    const retention: AppGraphBuilder.Retention = {
      evictable: () => {
        const { activeDeck, previousDeck } = registry.get(stateAtom);
        return evictableWorkspaces({
          rootChildren: AppGraph.getConnections(graph, GraphNode.RootId, 'child').map(({ id }) => id),
          activeDeck,
          previousDeck,
          active: registry.get(layoutAtom).active,
        });
      },
    };

    return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
  }),
);
