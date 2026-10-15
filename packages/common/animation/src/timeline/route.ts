//
// Copyright 2026 DXOS.org
//

import { type Graph, type GraphNetwork, type GraphNode, type Vec2, getNetwork } from '../model/index.ts';
import { type Path } from '../path.ts';
import { at } from '../util.ts';

/** Networks are adjacent through links and through nesting. */
export const networkAdjacency = (graph: Graph): Record<Path, Path[]> => {
  const adjacency: Record<Path, Path[]> = {};
  const add = (a: Path, b: Path): void => {
    (adjacency[a] ??= []).push(b);
    (adjacency[b] ??= []).push(a);
  };
  for (const link of graph.links) {
    add(link.from, link.to);
  }
  for (const network of Object.values(graph.networks)) {
    if (network.parent !== undefined) {
      add(network.path, network.parent);
    }
  }
  for (const list of Object.values(adjacency)) {
    list.sort();
  }
  return adjacency;
};

/** The shortest chain of networks from `from` to `to`, inclusive. */
export const findRoute = (adjacency: Record<Path, Path[]>, from: Path, to: Path): Path[] | undefined => {
  if (from === to) {
    return [from];
  }
  const previous = new Map<Path, Path>([[from, from]]);
  const queue = [from];
  for (let index = 0; index < queue.length; index++) {
    const current = at(queue, index);
    for (const next of adjacency[current] ?? []) {
      if (previous.has(next)) {
        continue;
      }
      previous.set(next, current);
      if (next === to) {
        const route = [to];
        for (let step = current; step !== from; step = previous.get(step) ?? from) {
          route.unshift(step);
        }
        route.unshift(from);
        return route;
      }
      queue.push(next);
    }
  }
  return undefined;
};

const rim = (network: GraphNetwork, toward: Vec2): Vec2 => {
  const dx = toward[0] - network.center[0];
  const dy = toward[1] - network.center[1];
  const distance = Math.hypot(dx, dy) || 1;
  return [network.center[0] + (dx / distance) * network.radius, network.center[1] + (dy / distance) * network.radius];
};

/** Node, out through each network's rim, across links (or into a child network), to the target node. */
export const packetPath = (graph: Graph, source: GraphNode, target: GraphNode, route: readonly Path[]): Vec2[] => {
  const points: Vec2[] = [source.position];
  for (let index = 0; index + 1 < route.length; index++) {
    const from = getNetwork(graph, at(route, index));
    const to = getNetwork(graph, at(route, index + 1));
    const last = at(points, points.length - 1);
    if (to.parent === from.path) {
      points.push(rim(to, last));
    } else if (from.parent === to.path) {
      points.push(rim(from, target.position));
    } else {
      points.push(rim(from, to.center), rim(to, from.center));
    }
  }
  points.push(target.position);
  return points;
};
