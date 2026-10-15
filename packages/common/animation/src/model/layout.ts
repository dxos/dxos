//
// Copyright 2026 DXOS.org
//

import { type Path } from '../path.ts';
import { type Random, createRandom } from '../random.ts';
import { type Graph, NODE_RADIUS, type Vec2, getNetwork, getNode } from './graph.ts';

const GAP = 60;
const PADDING = 80;
const STEP = 16;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type PackItem = { key: string; radius: number; at?: Vec2; near?: string };

type Placed = { x: number; y: number; r: number };

/**
 * Packs circles without overlap: pinned items first, then the rest largest first, each at the free
 * spot nearest its origin (the centre, or the item named by `near`) along a sunflower spiral.
 */
export const pack = (
  items: PackItem[],
  random: Random,
  gap = GAP,
): { positions: Record<string, Vec2>; radius: number } => {
  const placed: Placed[] = [];
  const positions: Record<string, Vec2> = {};
  const fits = (x: number, y: number, r: number): boolean =>
    placed.every((p) => Math.hypot(x - p.x, y - p.y) >= r + p.r + gap);
  const put = (key: string, x: number, y: number, r: number): void => {
    positions[key] = [x, y];
    placed.push({ x, y, r });
  };

  for (const item of items) {
    if (item.at) {
      put(item.key, item.at[0], item.at[1], item.radius);
    }
  }

  const queue = items.filter((item) => !item.at).sort((a, b) => b.radius - a.radius || a.key.localeCompare(b.key));
  while (queue.length > 0) {
    const index = Math.max(
      0,
      queue.findIndex(
        (item) =>
          item.near === undefined ||
          positions[item.near] !== undefined ||
          !items.some((other) => other.key === item.near),
      ),
    );
    const [item] = queue.splice(index, 1);
    if (!item) {
      break;
    }
    const origin = (item.near !== undefined ? positions[item.near] : undefined) ?? [0, 0];
    const phase = random.next() * Math.PI * 2;
    let x = origin[0];
    let y = origin[1];
    for (let step = 1; !fits(x, y, item.radius); step++) {
      const distance = Math.sqrt(step) * STEP;
      x = origin[0] + Math.cos(step * GOLDEN_ANGLE + phase) * distance;
      y = origin[1] + Math.sin(step * GOLDEN_ANGLE + phase) * distance;
    }
    put(item.key, x, y, item.radius);
  }

  const radius = placed.reduce((max, p) => Math.max(max, Math.hypot(p.x, p.y) + p.r), 0);
  return { positions, radius };
};

/** Places every network and node: children are packed inside their parent, roots around the origin. */
export const layout = (graph: Graph, seed: number): Graph => {
  const random = createRandom(seed).fork('layout');
  const local: Record<Path, Record<string, Vec2>> = {};

  const size = (path: Path): number => {
    const network = getNetwork(graph, path);
    const items: PackItem[] = [
      ...network.nodes.map((node) => ({ key: node, radius: NODE_RADIUS[getNode(graph, node).type] })),
      ...network.networks.map((child) => {
        const childNetwork = getNetwork(graph, child);
        return {
          key: child,
          radius: size(child),
          at: childNetwork.at,
          near: childNetwork.near === undefined ? undefined : `${path}/${childNetwork.near}`,
        };
      }),
    ];
    const { positions, radius } = pack(items, random.fork(path));
    local[path] = positions;
    network.radius = Math.max(network.radius, radius + PADDING);
    return network.radius;
  };

  const roots = pack(
    graph.roots.map((path) => {
      const network = getNetwork(graph, path);
      return { key: path, radius: size(path), at: network.at, near: network.near };
    }),
    random.fork('roots'),
  );

  const place = (path: Path, center: Vec2): void => {
    const network = getNetwork(graph, path);
    network.center = center;
    const offsets = local[path] ?? {};
    for (const node of network.nodes) {
      const offset = offsets[node] ?? [0, 0];
      getNode(graph, node).position = [center[0] + offset[0], center[1] + offset[1]];
    }
    for (const child of network.networks) {
      const offset = offsets[child] ?? [0, 0];
      place(child, [center[0] + offset[0], center[1] + offset[1]]);
    }
  };
  for (const path of graph.roots) {
    place(path, roots.positions[path] ?? [0, 0]);
  }
  return graph;
};
