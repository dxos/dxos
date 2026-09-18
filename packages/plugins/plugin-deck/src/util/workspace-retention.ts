//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as GraphNode from '@dxos/graph/GraphNode';
import type * as Retention from '@dxos/graph/Retention';

export type WorkspaceRetention = {
  activeDeck: string;
  previousDeck: string;
  retainedPlanks: readonly string[];
};

/** The workspaces the deck is showing or was last showing. */
export const retainedWorkspaces = ({
  activeDeck,
  previousDeck,
  retainedPlanks,
}: WorkspaceRetention): Retention.Region[] =>
  [...new Set([activeDeck, previousDeck, ...retainedPlanks.map(GraphPath.getWorkspaceFromPath)])]
    // A plank outside any workspace maps to the root, whose region would keep the whole graph.
    .filter((id) => id !== GraphNode.RootId)
    .map((id) => ({ id }));
