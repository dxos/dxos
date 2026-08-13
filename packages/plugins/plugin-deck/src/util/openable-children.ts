//
// Copyright 2026 DXOS.org
//

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as Graph from '@dxos/app-graph/Graph';

/**
 * A node's graph children that can be opened as planks, in graph order.
 *
 * Excludes actions and nodes carrying a `disposition`, which address a surface (a companion, a settings
 * panel) rather than something the deck can hold.
 */
export const openableChildren = (graph: Graph.ExpandableGraph, id: string): string[] =>
  Graph.getConnections(graph, id, 'child')
    .filter((node) => !AppGraphNode.isActionLike(node) && !node.properties.disposition)
    .map((node) => node.id);
