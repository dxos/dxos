//
// Copyright 2026 DXOS.org
//

import { type Path } from '../path.ts';
import { type Random, createRandom } from '../random.ts';
import { type Graph, NODE_RADIUS, type Vec2, getNetwork, getNode } from './graph.ts';

/** Device networks breathe; server networks pack tight. */
const SPACING = {
  devices: { gap: 60, padding: 80 },
  servers: { gap: 16, padding: 30 },
  cloud: { gap: 16, padding: 30 },
} as const;
const ROOT_GAP = 60;
const MIN_STEP = 16;
const MAX_STEPS = 20_000;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type PackItem = { key: string; radius: number; at?: Vec2; near?: string };

export type PackOptions = {
  gap?: number;
  /** Scatters free items across a band this wide outside the pinned items before packing. */
  spread?: number;
};

type Placed = { x: number; y: number; r: number };

/**
 * Packs circles without overlap: pinned items first, then the rest largest first, each at the free
 * spot nearest its origin (the centre, or the item named by `near`) along a sunflower spiral.
 */
export const pack = (
  items: PackItem[],
  random: Random,
  { gap = ROOT_GAP, spread }: PackOptions = {},
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

  const inner = placed.reduce((max, p) => Math.max(max, Math.hypot(p.x, p.y) + p.r), 0);
  const cursors = new Map<string, number>();
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
    const scatter = (): Vec2 => {
      const angle = random.next() * Math.PI * 2;
      const distance = inner + gap + item.radius + random.next() * (spread ?? 0);
      return [Math.cos(angle) * distance, Math.sin(angle) * distance];
    };
    const origin =
      (item.near !== undefined ? positions[item.near] : undefined) ??
      (spread !== undefined && spread > 0 ? scatter() : [0, 0]);
    const originKey = `${origin[0]},${origin[1]}`;
    const phase = random.next() * Math.PI * 2;
    // The step scales with the circles involved so the spiral reaches large neighbours in few steps.
    const largest = placed.reduce((max, p) => Math.max(max, p.r), 0);
    const spacing = Math.max(MIN_STEP, item.radius / 2, largest / 200);
    // Items arrive largest first, so the spiral resumes near where the previous one from this origin landed.
    const first = Math.floor((cursors.get(originKey) ?? 0) * 0.5);
    let x = origin[0];
    let y = origin[1];
    let step = first;
    let found = first === 0 && fits(x, y, item.radius);
    for (; !found && step < first + MAX_STEPS; step++) {
      const distance = Math.sqrt(step + 1) * spacing;
      x = origin[0] + Math.cos(step * GOLDEN_ANGLE + phase) * distance;
      y = origin[1] + Math.sin(step * GOLDEN_ANGLE + phase) * distance;
      found = fits(x, y, item.radius);
    }
    if (!found) {
      const outer = placed.reduce((max, p) => Math.max(max, Math.hypot(p.x - origin[0], p.y - origin[1]) + p.r), 0);
      x = origin[0] + Math.cos(phase) * (outer + item.radius + gap);
      y = origin[1] + Math.sin(phase) * (outer + item.radius + gap);
    }
    cursors.set(originKey, step);
    put(item.key, x, y, item.radius);
  }

  const radius = placed.reduce((max, p) => Math.max(max, Math.hypot(p.x, p.y) + p.r), 0);
  return { positions, radius };
};

/** The `count` hexagonal-lattice points nearest the centre: the densest packing for equal circles. */
export const hexPack = (count: number, radius: number, gap: number): Vec2[] => {
  const pitch = 2 * radius + gap;
  const rings = Math.ceil(Math.sqrt(count)) + 1;
  const points: Vec2[] = [];
  for (let row = -rings; row <= rings; row++) {
    for (let column = -rings; column <= rings; column++) {
      points.push([(column + row / 2) * pitch, ((row * Math.sqrt(3)) / 2) * pitch]);
    }
  }
  return points
    .sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]) || a[1] - b[1] || a[0] - b[0])
    .slice(0, count);
};

/** Places every network and node: children are packed inside their parent, roots around the origin. */
export const layout = (graph: Graph, seed: number, options: PackOptions = {}): Graph => {
  const random = createRandom(seed).fork('layout');
  const local: Record<Path, Record<string, Vec2>> = {};
  const hex = (items: PackItem[], gap: number): { positions: Record<string, Vec2>; radius: number } => {
    const itemRadius = items[0]?.radius ?? 0;
    const points = hexPack(items.length, itemRadius, gap);
    const positions: Record<string, Vec2> = {};
    items.forEach((item, index) => {
      positions[item.key] = points[index] ?? [0, 0];
    });
    const radius = points.reduce((max, [x, y]) => Math.max(max, Math.hypot(x, y) + itemRadius), 0);
    return { positions, radius };
  };

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
    const spacing = SPACING[network.kind];
    const gap = network.gap ?? spacing.gap;
    const radii = new Set(items.map((item) => item.radius));
    const uniform =
      network.networks.length === 0 && items.length > 1 && radii.size === 1 && items.every((item) => !item.at);
    const { positions, radius } = uniform ? hex(items, gap) : pack(items, random.fork(path), { gap });
    local[path] = positions;
    network.radius = Math.max(network.radius, radius + (network.padding ?? spacing.padding));
    return network.radius;
  };

  const roots = pack(
    graph.roots.map((path) => {
      const network = getNetwork(graph, path);
      return { key: path, radius: size(path), at: network.at, near: network.near };
    }),
    random.fork('roots'),
    { gap: options.gap ?? ROOT_GAP, spread: options.spread },
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
