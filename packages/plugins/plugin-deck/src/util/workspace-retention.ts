//
// Copyright 2026 DXOS.org
//

import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as GraphNode from '@dxos/graph/GraphNode';

export type WorkspaceRetention = {
  activeDeck: string;
  previousDeck: string;
  retainedPlanks: readonly string[];
};

/** A region at the root reaches every node, so a plank outside any workspace names nothing to retain. */
const wouldKeepWholeGraph = (id: string): boolean => id === GraphNode.RootId;

/** The workspaces the deck is showing, was last showing, or is opening into. */
export const retainedWorkspaces = ({
  activeDeck,
  previousDeck,
  retainedPlanks,
}: WorkspaceRetention): AppGraphBuilder.Region[] =>
  [...new Set([activeDeck, previousDeck, ...retainedPlanks.map(GraphPath.getWorkspaceFromPath)])]
    .filter((id) => !wouldKeepWholeGraph(id))
    .map((id) => ({ id }));
