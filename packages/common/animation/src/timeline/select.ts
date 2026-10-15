//
// Copyright 2026 DXOS.org
//

import { type Graph, descendants } from '../model/index.ts';
import { type Path, matchSelector } from '../path.ts';

/** Network and node paths a selector matches, sorted. */
export const matchedPaths = (graph: Graph, selector: string): Path[] => {
  const match = matchSelector(selector);
  return [...Object.keys(graph.networks), ...Object.keys(graph.nodes)].filter(match).sort();
};

/** A network with everything below it, or a node on its own. */
export const withDescendants = (graph: Graph, path: Path): Path[] => {
  if (!graph.networks[path]) {
    return [path];
  }
  const below = descendants(graph, path);
  return [path, ...below.networks, ...below.nodes];
};
