//
// Copyright 2026 DXOS.org
//

import { type Path } from '../path.ts';
import { type Random, createRandom, hash } from '../random.ts';
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
  /** 0–1: how far belt items stray from the belt's centre line and their even angle. */
  jitter?: number;
};

type Placed = { x: number; y: number; r: number };

/**
 * Packs circles without overlap: pinned items first, then the rest largest first, each at the free
 * spot nearest its origin (the centre, or the item named by `near`) along a sunflower spiral.
 */
export const pack = (
  items: PackItem[],
  random: Random,
  { gap = ROOT_GAP, spread, jitter = 0.5 }: PackOptions = {},
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
  // With a spread, free items get evenly spaced angles in a belt outside the pinned items.
  const belt =
    spread !== undefined && spread > 0
      ? items.filter((item) => !item.at && item.near === undefined).sort((a, b) => (a.key < b.key ? -1 : 1))
      : [];
  const beltPhase = random.next() * Math.PI * 2;
  // Each item's angular slot is proportional to its width, so mixed sizes sit on one ring without touching.
  const spans = belt.map((item) => 2 * item.radius + gap);
  const total = spans.reduce((sum, span) => sum + span, 0);
  const starts = spans.map((_, index) => spans.slice(0, index).reduce((sum, span) => sum + span, 0));
  const angleOf = (index: number): number =>
    beltPhase + (((starts[index] ?? 0) + (spans[index] ?? 0) / 2) / Math.max(total, 1)) * Math.PI * 2;
  const largestBelt = belt.reduce((max, item) => Math.max(max, item.radius), 0);
  // The ring sits in the middle of the band, widened until every neighbouring pair clears by `gap` along the chord.
  let ring = Math.max(inner + gap + largestBelt + (spread ?? 0) / 2, total / (2 * Math.PI));
  const clears = (radius: number): boolean =>
    belt.every((item, index) => {
      const next = (index + 1) % belt.length;
      const other = belt[next];
      if (!other || next === index) {
        return true;
      }
      const delta = Math.abs(angleOf(next) - angleOf(index));
      const chord = 2 * radius * Math.sin(Math.min(Math.PI, delta) / 2);
      return chord >= item.radius + other.radius + gap;
    });
  while (!clears(ring)) {
    ring *= 1.02;
  }
  const slot = (item: PackItem): Vec2 | undefined => {
    const index = belt.indexOf(item);
    if (index < 0) {
      return undefined;
    }
    const angle =
      angleOf(index) + (random.next() - 0.5) * ((spans[index] ?? 0) / Math.max(total, 1)) * Math.PI * 2 * 0.4 * jitter;
    const distance = Math.max(inner + gap + item.radius, ring + (random.next() - 0.5) * (spread ?? 0) * jitter);
    return [Math.cos(angle) * distance, Math.sin(angle) * distance];
  };
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
    const origin = (item.near !== undefined ? positions[item.near] : undefined) ?? slot(item) ?? [0, 0];
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

/**
 * Spreads circles evenly over a disc: seeds a sunflower spiral (sizes interleaved), then pushes
 * overlapping pairs apart while holding everything inside the disc, growing the disc only if needed.
 */
export const sunflower = (
  items: PackItem[],
  gap: number,
): { positions: Record<string, Vec2>; radius: number } | undefined => {
  const sorted = [...items].sort((a, b) => hash(a.key) - hash(b.key) || (a.key < b.key ? -1 : 1));
  const radii = sorted.map((item) => item.radius);
  const count = sorted.length;
  // Start at a disc these circles fill to about half its area.
  let disc = Math.sqrt(radii.reduce((sum, radius) => sum + (radius + gap / 2) ** 2, 0) / 0.5);
  for (let attempt = 0; attempt < 40; attempt++, disc *= 1.05) {
    const points = radii.map((radius, index): [number, number] => {
      const distance = Math.sqrt((index + 0.5) / count) * Math.max(0, disc - radius);
      return [Math.cos(index * GOLDEN_ANGLE) * distance, Math.sin(index * GOLDEN_ANGLE) * distance];
    });
    let clear = false;
    for (let iteration = 0; iteration < 300 && !clear; iteration++) {
      clear = true;
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = points[i];
          const b = points[j];
          if (!a || !b) {
            continue;
          }
          const need = (radii[i] ?? 0) + (radii[j] ?? 0) + gap;
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const distance = Math.hypot(dx, dy);
          if (distance < need) {
            clear = false;
            const angle = distance > 0 ? Math.atan2(dy, dx) : (i + j) * GOLDEN_ANGLE;
            const push = (need - distance) / 2 + 0.5;
            a[0] -= Math.cos(angle) * push;
            a[1] -= Math.sin(angle) * push;
            b[0] += Math.cos(angle) * push;
            b[1] += Math.sin(angle) * push;
          }
        }
      }
      points.forEach((point, index) => {
        const limit = Math.max(0, disc - (radii[index] ?? 0));
        const distance = Math.hypot(point[0], point[1]);
        if (distance > limit) {
          point[0] *= limit / distance;
          point[1] *= limit / distance;
          clear = false;
        }
      });
    }
    const overlapping = points.some((a, i) =>
      points
        .slice(i + 1)
        .some((b, k) => Math.hypot(a[0] - b[0], a[1] - b[1]) < (radii[i] ?? 0) + (radii[i + 1 + k] ?? 0) + gap - 1e-6),
    );
    if (!overlapping) {
      const positions: Record<string, Vec2> = {};
      sorted.forEach((item, index) => {
        positions[item.key] = points[index] ?? [0, 0];
      });
      const radius = points.reduce((max, [x, y], index) => Math.max(max, Math.hypot(x, y) + (radii[index] ?? 0)), 0);
      return { positions, radius };
    }
  }
  return undefined;
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
    const spreadOut =
      network.kind !== 'devices' &&
      network.networks.length > 0 &&
      items.every((item) => !item.at && item.near === undefined);
    const { positions, radius } =
      (uniform ? hex(items, gap) : undefined) ??
      (spreadOut ? sunflower(items, gap) : undefined) ??
      pack(items, random.fork(path), { gap });
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
    { gap: options.gap ?? ROOT_GAP, spread: options.spread, jitter: options.jitter },
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
