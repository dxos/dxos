//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';

import { useGraphModel } from './useGraphModel';

/** Default traversal depth (hops) for the neighborhood graph. */
export const DEFAULT_NEIGHBORHOOD_DEPTH = 2;

/**
 * Builds an ego graph around `object`: the n-hop neighbourhood reached by following refs and
 * relations from the active node. The full space graph is materialised (reactively) and then
 * narrowed to the nodes within `depth` hops, keeping only edges whose endpoints both survive.
 *
 * NOTE: Derives the subgraph from the whole-space model — the same cost the main explorer pays.
 * A direct ECHO traversal that loads only the reachable objects is a future optimisation.
 */
export const useNeighborhoodModel = (
  object: Obj.Unknown | undefined,
  depth = DEFAULT_NEIGHBORHOOD_DEPTH,
): SpaceGraphModel | undefined => {
  const db = object ? Obj.getDatabase(object) : undefined;
  const fullModel = useGraphModel(db);
  const [model, setModel] = useState<SpaceGraphModel | undefined>(undefined);

  useEffect(() => {
    if (!fullModel || !object) {
      setModel(undefined);
      return;
    }

    const recompute = () => setModel(buildNeighborhood(fullModel, object.id, depth));
    recompute();
    return fullModel.subscribe(recompute);
  }, [fullModel, object?.id, depth]);

  return model;
};

/**
 * Narrow the full graph to the BFS neighbourhood of `rootId` within `depth` hops (edges treated as
 * undirected so the neighbourhood reads as graph distance regardless of ref/relation direction).
 */
const buildNeighborhood = (fullModel: SpaceGraphModel, rootId: string, depth: number): SpaceGraphModel => {
  const { nodes, edges } = fullModel.graph;

  const adjacency = new Map<string, string[]>();
  const link = (from: string, to: string) => {
    const list = adjacency.get(from) ?? [];
    list.push(to);
    adjacency.set(from, list);
  };
  for (const edge of edges) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }

  const included = new Set<string>([rootId]);
  let frontier = [rootId];
  for (let hop = 0; hop < depth && frontier.length; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbour of adjacency.get(id) ?? []) {
        if (!included.has(neighbour)) {
          included.add(neighbour);
          next.push(neighbour);
        }
      }
    }
    frontier = next;
  }

  const subNodes = nodes.filter((node: SpaceGraphNode) => included.has(node.id));
  const subEdges = edges.filter((edge: SpaceGraphEdge) => included.has(edge.source) && included.has(edge.target));
  return fullModel.copy({ nodes: subNodes, edges: subEdges });
};
