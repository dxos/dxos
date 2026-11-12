//
// Copyright 2026 DXOS.org
//

//
// Space graph: one ECHO space drawn as a circle holding a connected graph of objects on a hexagonal lattice.
// A canvas Generator (`CanvasGeneratorsSkill`): stateless, so it scrubs freely, and reproducible from `seed` — the
// same parameters give the same graph at any position.
//
// Ported from studio `packages/substrate` (hex-graph.mjs, random.mjs) and `assets/deck/lib/substrate-view.mjs`.
// `layout()`, `pick()` and `toward()` are the studio draft's, unchanged: `space-graph.test.ts` compares them with
// `golden-seed7.json`, the deck's own output, so the algorithm cannot drift from the slide it copies.
//
// Readers are nodes bound through the `readers` parameter (`x-binding: node`). From each reader's right edge the
// generator draws a link to `picks` graph objects near a point level with it, and lights those objects: the agents
// that read and write this space. A reader moved on the canvas moves its links and may light others.
//

import { type Point, type Shape, defineGenerator } from '@dxos/react-ui-canvas/motion';

type Link = [number, number];

export type Params = {
  seed: number;
  /** Distance between neighbouring lattice points, in scene units. */
  pitch: number;
  /** Share of lattice points that become objects (0–1). */
  fill: number;
  /** Chance that each other pair of neighbouring objects is linked (0–1). */
  extra: number;
  /** Object radius as a percentage of pitch. */
  size: number;
  /** Nodes on the canvas (cards) that read and write this space. */
  readers?: string[];
  /** Graph objects each reader reaches. */
  picks?: number;
  /** Lit objects and reader links. */
  hue?: string;
};

// ---------------------------------------------------------------- geometry (pure; tested against the golden file)

/** Mulberry32: seeded floats in [0, 1). `ctx.random()` would give a different graph than the deck's. */
const rng = (seed: number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(list: T[], random: () => number): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Lattice points (rows offset by half a pitch) within `radius` of `center`; the lattice is anchored at `origin`. */
const hexCells = (center: Point, radius: number, pitch: number, origin: Point): Point[] => {
  const h = (pitch * Math.sqrt(3)) / 2;
  const cells: Point[] = [];
  const r0 = Math.floor((center.y - radius - origin.y) / h) - 1;
  const r1 = Math.ceil((center.y + radius - origin.y) / h) + 1;
  for (let r = r0; r <= r1; r++) {
    const y = origin.y + r * h;
    const offset = r & 1 ? pitch / 2 : 0;
    const q0 = Math.floor((center.x - radius - origin.x - offset) / pitch) - 1;
    const q1 = Math.ceil((center.x + radius - origin.x - offset) / pitch) + 1;
    for (let q = q0; q <= q1; q++) {
      const x = origin.x + q * pitch + offset;
      if (Math.hypot(x - center.x, y - center.y) <= radius) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
};

/** Minimum spanning tree over nearby pairs (neighbours first), then random extra links between neighbours. */
const connect = (nodes: Point[], pitch: number, extra: number, random: () => number): Link[] => {
  const candidates: [number, number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist(nodes[i], nodes[j]);
      if (d < pitch * 2.05) {
        candidates.push([d + random() * 1e-3, i, j]);
      }
    }
  }
  candidates.sort((a, b) => a[0] - b[0]);

  const parent = nodes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const links: Link[] = [];
  const inTree = new Set<string>();
  for (const [, i, j] of candidates) {
    const a = find(i);
    const b = find(j);
    if (a !== b) {
      parent[a] = b;
      links.push([i, j]);
      inTree.add(`${i}|${j}`);
    }
  }

  // Pieces separated by more than two lattice steps join their nearest neighbour piece.
  for (;;) {
    const root = find(0);
    if (nodes.every((_, i) => find(i) === root)) {
      break;
    }
    let best: [number, number, number] | null = null;
    for (let i = 0; i < nodes.length; i++) {
      if (find(i) !== root) {
        continue;
      }
      for (let j = 0; j < nodes.length; j++) {
        if (find(j) === root) {
          continue;
        }
        const d = dist(nodes[i], nodes[j]);
        if (!best || d < best[0]) {
          best = [d, i, j];
        }
      }
    }
    parent[find(best![2])] = root;
    links.push([best![1], best![2]]);
  }

  for (const [d, i, j] of candidates) {
    if (d > pitch * 1.01) {
      break;
    }
    if (!inTree.has(`${i}|${j}`) && random() < extra) {
      links.push([i, j]);
    }
  }
  return links;
};

/** The graph inside a circle: lattice cells, the cells that are objects, and links as index pairs into `nodes`. */
export const layout = (center: Point, r: number, p: Pick<Params, 'seed' | 'pitch' | 'fill' | 'extra' | 'size'>) => {
  const nodeR = (p.pitch * p.size) / 100;
  const inner = r - nodeR - p.pitch * 0.35;
  const cells = hexCells(center, Math.max(0, inner), p.pitch, center);
  if (!cells.length) {
    cells.push({ ...center });
  }
  const random = rng(p.seed);
  const count = Math.min(cells.length, Math.max(5, Math.round(cells.length * p.fill)));
  const nodes = shuffle(cells, random).slice(0, count);
  const links = connect(nodes, p.pitch, p.extra, random);
  return { cells, nodes, links, nodeR };
};

/** `n` objects near a point: every third of the 3n nearest, so picks spread out instead of clumping. */
export const pick = (nodes: Point[], n: number, near: Point): number[] =>
  nodes
    .map((node, i) => ({ i, d: dist(node, near) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n * 3)
    .filter((_, k) => k % 3 === 0)
    .slice(0, n)
    .map(({ i }) => i);

/** Where reader `i` (in binding order) aims: level with it, pulled towards the middle, alternating near and far. */
export const toward = (center: Point, r: number, from: Point, i: number): Point => ({
  x: center.x - r * 0.05 + (i % 2) * r * 0.3,
  y: center.y + (from.y - center.y) * 0.75,
});

/** The horizontal S-curve the deck uses for links (`lib/components.mjs` `path.curve`). */
export const curve = (a: Point, b: Point): string => {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5) * Math.sign(b.x - a.x || 1);
  return `M${a.x} ${a.y} C${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`;
};

const ring = (c: Point, r: number) =>
  `M${c.x - r} ${c.y} A${r} ${r} 0 1 0 ${c.x + r} ${c.y} A${r} ${r} 0 1 0 ${c.x - r} ${c.y}`;

// ---------------------------------------------------------------- generator

const DEFAULTS = { picks: 2, hue: 'violet' } as const;

export default defineGenerator<Params>({
  sample: (ctx) => {
    const p = { ...DEFAULTS, ...ctx.params };
    const bounds = ctx.bounds;
    const center: Point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const r = Math.min(bounds.width, bounds.height) / 2;
    const { cells, nodes, links, nodeR } = layout(center, r, p);

    // A reader's own links, drawn here rather than as canvas links: a link cannot end at a point *inside* a node,
    // and the objects of a generated graph are shapes, not nodes, so there is nothing for one to bind to.
    const lit = new Set<number>();
    const taps: string[] = [];
    (ctx.bound.readers ?? []).forEach((reader, index) => {
      if (!('center' in reader)) {
        return;
      }
      const from: Point = { x: reader.center.x + reader.size.width / 2, y: reader.center.y };
      for (const k of pick(nodes, p.picks, toward(center, r, from, index))) {
        lit.add(k);
        taps.push(curve(from, nodes[k]));
      }
    });

    const on = new Set(nodes.map((node) => `${node.x},${node.y}`));
    const shapes: Shape[] = [
      { kind: 'path', d: ring(center, r), width: 1.8, hue: 'neutral' },
      // The lattice points no object sits on, as faint dots.
      ...cells
        .filter((cell) => !on.has(`${cell.x},${cell.y}`))
        .map((cell): Shape => ({
          kind: 'circle',
          center: cell,
          radius: Math.max(1.3, nodeR * 0.3),
          hue: 'neutral',
          opacity: 0.35,
        })),
      ...links.map(([i, j]): Shape => ({
        kind: 'path',
        d: `M${nodes[i].x} ${nodes[i].y} L${nodes[j].x} ${nodes[j].y}`,
        width: Math.max(1.6, nodeR * 0.36),
        hue: 'neutral',
        opacity: 0.6,
      })),
      ...taps.map((d): Shape => ({ kind: 'path', d, width: 1.8, hue: p.hue })),
      ...nodes.map((node, k): Shape =>
        lit.has(k)
          ? { kind: 'circle', center: node, radius: nodeR + 2.4, hue: p.hue }
          : { kind: 'circle', center: node, radius: nodeR, hue: 'neutral' },
      ),
    ];
    return shapes;
  },
});
