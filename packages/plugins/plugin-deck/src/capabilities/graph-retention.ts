//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphNode from '@dxos/graph/GraphNode';

import { DeckCapabilities } from '#types';

import { evictableWorkspaces } from '../util/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = yield* DeckCapabilities.State;
    const layoutAtom = yield* AppCapabilities.Layout;
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);

    const retention: AppGraphBuilder.Retention = {
      evictable: Atom.make((get) => {
        const { activeDeck, previousDeck } = get(stateAtom);
        return evictableWorkspaces({
          rootChildren: get(graph.connections(GraphNode.RootId, 'child')).map(({ id }) => id),
          activeDeck,
          previousDeck,
          active: get(layoutAtom).active,
        });
      }),
    };

    return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
  }),
);
