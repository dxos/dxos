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

/** The workspaces the deck shows or is about to, kept whole; the graph root is never named, since that would keep everything. */
export const retainedWorkspaces = ({
  activeDeck,
  previousDeck,
  retainedPlanks,
}: WorkspaceRetention): AppGraphBuilder.Region[] =>
  [...new Set([activeDeck, previousDeck, ...retainedPlanks.map(GraphPath.getWorkspaceFromPath)])]
    .filter((id) => id !== GraphNode.RootId)
    .map((id) => ({ id }));
