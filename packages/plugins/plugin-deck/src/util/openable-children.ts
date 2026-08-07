//
// Copyright 2026 DXOS.org
//

import { Graph, Node } from '@dxos/plugin-graph';

/**
 * A node's graph children that can be opened as planks, in graph order.
 *
 * Excludes actions and nodes carrying a `disposition`, which address a surface (a companion, a settings
 * panel) rather than something the deck can hold.
 */
export const openableChildren = (graph: Graph.ExpandableGraph, id: string): string[] =>
  Graph.getConnections(graph, id, 'child')
    .filter((node) => !Node.isActionLike(node) && !node.properties.disposition)
    .map((node) => node.id);
