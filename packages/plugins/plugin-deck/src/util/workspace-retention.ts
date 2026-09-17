//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as GraphNode from '@dxos/graph/GraphNode';

export const pendingPlanks = Atom.make<readonly string[]>([]).pipe(Atom.keepAlive);

export type WorkspaceRetention = {
  activeDeck: string;
  previousDeck: string;
  retainedPlanks: readonly string[];
};

/**
 * Every node on the root, so the rail keeps its workspaces, plus the whole of each workspace the deck shows or
 * is about to. The root itself is only ever kept to depth 1, since naming it whole would keep everything.
 */
export const retainedWorkspaces = ({
  activeDeck,
  previousDeck,
  retainedPlanks,
}: WorkspaceRetention): AppGraphBuilder.Region[] => [
  { id: GraphNode.RootId, depth: 1 },
  ...[...new Set([activeDeck, previousDeck, ...retainedPlanks.map(GraphPath.getWorkspaceFromPath)])]
    .filter((id) => id !== GraphNode.RootId)
    .map((id) => ({ id })),
];
