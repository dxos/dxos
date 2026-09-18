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

/** A region at the root reaches every node, so a plank outside any workspace names nothing to retain. */
const wouldKeepWholeGraph = (id: string): boolean => id === GraphNode.RootId;

/** The workspaces the deck is showing or was last showing. */
export const retainedWorkspaces = ({
  activeDeck,
  previousDeck,
  retainedPlanks,
}: WorkspaceRetention): Retention.Region[] =>
  [...new Set([activeDeck, previousDeck, ...retainedPlanks.map(GraphPath.getWorkspaceFromPath)])]
    .filter((id) => !wouldKeepWholeGraph(id))
    .map((id) => ({ id }));
