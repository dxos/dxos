//
// Copyright 2026 DXOS.org
//

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

/**
 * A node's graph children that can be opened as planks, in graph order.
 *
 * Excludes actions and nodes carrying a `disposition`, which address a surface (a companion, a settings
 * panel) rather than something the deck can hold.
 */
export const openableChildren = (graph: AppGraph.ExpandableGraph, id: string): string[] =>
  AppGraph.getConnections(graph, id, 'child')
    .filter((node) => !AppGraphNode.isActionLike(node) && !node.properties.disposition)
    .map((node) => node.id);
