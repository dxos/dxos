//
// Copyright 2026 DXOS.org
//

import { type Block, type DataFlowLayout, type Rect } from './layout.ts';
import { type Body, type LatticeBond } from './simulation.ts';

/** A one-bucket hub part way to its partitioned `target`: `progress` runs from 0 (as laid out) to 1 (the target). */
export type HubMorph = {
  /** The one-bucket hub the morph starts from: the layout drawn alongside may already be the split one. */
  from: Block;
  target: Block;
  progress: number;
  /**
   * The split already made in the simulation, by this plan: its molecules sit in their new places and are drawn sliding
   * in from their old ones. Unset, the morph only redraws a held frame, planning the split itself.
   */
  applied?: ReadonlyMap<string, SplitMove>;
};

type Point = { x: number; y: number };

const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

const mixRect = (from: Rect, to: Rect, progress: number): Rect => ({
  x: mix(from.x, to.x, progress),
  y: mix(from.y, to.y, progress),
  width: mix(from.width, to.width, progress),
  height: mix(from.height, to.height, progress),
});

/** The space a one-bucket hub's lattice fills: its one bucket when laid out partitioned, else its well. */
const regionOf = (hub: Block): Rect => hub.buckets?.[0] ?? hub.well;

/** Where each of the target's buckets starts: the well cut into equal pieces with no frame between them. */
const startBuckets = (hub: Block, { target }: HubMorph): Rect[] => {
  const well = regionOf(hub);
  const buckets = target.buckets ?? [];
  const width = well.width / buckets.length;
  return buckets.map((_, index) => ({ ...well, x: well.x + index * width, width }));
};

/** The hub as drawn part way through `morph`: its frame, well and buckets each eased toward the target's. */
export const morphBlock = (hub: Block, morph: HubMorph): Block => {
  const { target, progress } = morph;
  const starts = startBuckets(hub, morph);
  return {
    ...target,
    frame: mixRect(hub.frame, target.frame, progress),
    well: mixRect(hub.well, target.well, progress),
    buckets: (target.buckets ?? []).map((bucket, index) => mixRect(starts[index], bucket, progress)),
  };
};

/** Where a docked molecule ends up once the hub is split: how far it travels, or that it fades where it is. */
export type SplitMove = { shift: Point; kept: boolean };

type Cluster = { ids: string[]; left: number; right: number; centre: number };

/** Lattice room between clusters packed into one bucket, and kept clear of its walls. */
const CLUSTER_GAP = 2;
const WALL_ROOM = 1;

/** The hub's docked molecules in clusters: each a connected piece of its lattice, with its extent across the hub. */
const clustersOf = (bodies: readonly Body[], bonds: readonly LatticeBond[]): Cluster[] => {
  const docked = bodies.filter((body) => body.zone === 'hub' && body.phase === 'docked');
  const parent = new Map(docked.map((body) => [body.id, body.id]));
  const root = (id: string): string => {
    const up = parent.get(id) ?? id;
    return up === id ? id : root(up);
  };
  for (const bond of bonds) {
    const [from, to] = bond.id.split(':');
    if (bond.zone === 'hub' && parent.has(from) && parent.has(to)) {
      parent.set(root(from), root(to));
    }
  }
  const groups = new Map<string, Body[]>();
  for (const body of docked) {
    groups.set(root(body.id), [...(groups.get(root(body.id)) ?? []), body]);
  }
  const clusters: Cluster[] = [...groups.values()].map((members) => {
    const xs = members.flatMap((body) => body.offsets.map((offset) => body.position.x + offset.x));
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    return { ids: members.map((body) => body.id), left, right, centre: (left + right) / 2 };
  });
  return clusters;
};

/**
 * Plans the split along the lattice's natural break points: its docked molecules fall into clusters (each a connected
 * piece of the lattice), every cluster moves whole, and none is ever cut. Taken in order across the lattice, the clusters
 * are split into three runs, one per bucket, at the breaks that keep the most molecules, the middle run preferably
 * drawing from both sides of the centre; each run packs side by side, centred in its bucket. Moves are whole lattice
 * steps, so every cluster stays on the hex grid; one no bucket has room for fades where it is.
 */
export const planSplit = (
  hub: Block,
  target: Block,
  bodies: readonly Body[],
  bonds: readonly LatticeBond[],
  spacing: number,
): Map<string, SplitMove> => {
  const clusters = clustersOf(bodies, bonds);

  const region = regionOf(hub);
  const middle = region.x + region.width / 2;
  const ordered = [...clusters].sort((a, b) => a.centre - b.centre);
  const [first, centre, last] = target.buckets ?? [];
  const room = (bucket: Rect) => bucket.width - 2 * WALL_ROOM * spacing;
  const span = (members: readonly Cluster[]) =>
    members.reduce((sum, cluster) => sum + cluster.right - cluster.left, 0) +
    Math.max(0, members.length - 1) * CLUSTER_GAP * spacing;
  const size = (members: readonly Cluster[]) => members.reduce((sum, cluster) => sum + cluster.ids.length, 0);
  // The clusters an over-full bucket keeps: it lets go of those at its outer edge (either end for the middle) first.
  const fit = (members: Cluster[], bucket: Rect, outer: 'start' | 'end' | 'wider'): Cluster[] => {
    const kept = [...members];
    while (kept.length > 0 && span(kept) > room(bucket)) {
      if (outer === 'start' || (outer === 'wider' && width(kept[0]) >= width(kept[kept.length - 1]))) {
        kept.shift();
      } else {
        kept.pop();
      }
    }
    return kept;
  };
  const width = (cluster: Cluster) => cluster.right - cluster.left;

  // The breaks between clusters, in their order across the lattice, that keep the most molecules: the three runs go to
  // the three buckets. Of equals, one whose middle run takes clusters from both sides of the centre wins.
  let best: { groups: Cluster[][]; score: number } | undefined;
  for (let cut = 0; cut <= ordered.length; cut++) {
    for (let next = cut; next <= ordered.length; next++) {
      const groups = [
        fit(ordered.slice(0, cut), first, 'start'),
        fit(ordered.slice(cut, next), centre, 'wider'),
        fit(ordered.slice(next), last, 'end'),
      ];
      const straddles =
        groups[1].some((cluster) => cluster.centre < middle) && groups[1].some((cluster) => cluster.centre >= middle);
      const score = size(groups.flat()) * 2 + (straddles ? 1 : 0);
      if (!best || score > best.score) {
        best = { groups, score };
      }
    }
  }

  // Rows alternate their offset, so a vertical move keeps the grid only in steps of two rows.
  const rise = spacing * Math.sqrt(3);
  const lift = Math.round((centre.y + centre.height / 2 - (region.y + region.height / 2)) / rise) * rise;
  const moves = new Map<string, SplitMove>();
  for (const cluster of clusters) {
    cluster.ids.forEach((id) => moves.set(id, { shift: { x: 0, y: 0 }, kept: false }));
  }
  [first, centre, last].forEach((bucket, index) => {
    const members = best?.groups[index] ?? [];
    let x = bucket.x + (bucket.width - span(members)) / 2;
    for (const cluster of members) {
      const shift = { x: Math.round((x - cluster.left) / spacing) * spacing, y: lift };
      cluster.ids.forEach((id) => moves.set(id, { shift, kept: true }));
      x += width(cluster) + CLUSTER_GAP * spacing;
    }
  });
  return moves;
};

/**
 * Plans a hub's move to `target`, a layout of the same hub with its buckets moved or resized: a one-bucket hub becoming
 * a partitioned one splits at its natural breaks (`planSplit`); otherwise each bucket's clusters keep their arrangement
 * and move with it, centred in its new place, packing closer (and, failing that, letting the outermost fade) only where
 * the new bucket is too narrow for them.
 */
export const planMove = (
  hub: Block,
  target: Block,
  bodies: readonly Body[],
  bonds: readonly LatticeBond[],
  spacing: number,
): Map<string, SplitMove> => {
  const from = hub.buckets ?? [hub.well];
  const to = target.buckets ?? [target.well];
  if (from.length === 1 && to.length > 1) {
    return planSplit(hub, target, bodies, bonds, spacing);
  }
  const clusters = clustersOf(bodies, bonds);
  const rise = spacing * Math.sqrt(3);
  const moves = new Map<string, SplitMove>();
  const width = (cluster: Cluster) => cluster.right - cluster.left;
  from.forEach((bucket, index) => {
    const members = clusters
      .filter((cluster) => {
        const nearest = from.reduce(
          (best, candidate, at) =>
            Math.abs(candidate.x + candidate.width / 2 - cluster.centre) <
            Math.abs(from[best].x + from[best].width / 2 - cluster.centre)
              ? at
              : best,
          0,
        );
        return nearest === index;
      })
      .sort((a, b) => a.centre - b.centre);
    const next = to[index];
    if (!next) {
      members.forEach((cluster) => cluster.ids.forEach((id) => moves.set(id, { shift: { x: 0, y: 0 }, kept: false })));
      return;
    }
    const lift = Math.round((next.y + next.height / 2 - (bucket.y + bucket.height / 2)) / rise) * rise;
    const room = next.width - 2 * WALL_ROOM * spacing;
    const left = Math.min(...members.map((cluster) => cluster.left));
    const right = Math.max(...members.map((cluster) => cluster.right));
    if (members.length === 0) {
      return;
    }
    if (right - left <= room) {
      // Room for them as they are: they move together, centred in the new bucket.
      const shift = { x: Math.round((next.x + next.width / 2 - (left + right) / 2) / spacing) * spacing, y: lift };
      members.forEach((cluster) => cluster.ids.forEach((id) => moves.set(id, { shift, kept: true })));
      return;
    }
    const packed = [...members];
    const span = () =>
      packed.reduce((sum, cluster) => sum + width(cluster), 0) + Math.max(0, packed.length - 1) * CLUSTER_GAP * spacing;
    while (packed.length > 0 && span() > room) {
      const dropped = width(packed[0]) >= width(packed[packed.length - 1]) ? packed.shift() : packed.pop();
      dropped?.ids.forEach((id) => moves.set(id, { shift: { x: 0, y: 0 }, kept: false }));
    }
    let x = next.x + (next.width - span()) / 2;
    for (const cluster of packed) {
      const shift = { x: Math.round((x - cluster.left) / spacing) * spacing, y: lift };
      cluster.ids.forEach((id) => moves.set(id, { shift, kept: true }));
      x += width(cluster) + CLUSTER_GAP * spacing;
    }
  });
  return moves;
};

/** When each thing a relayout adds arrives, as fractions of the relayout: when it starts to fade in, and for how long. */
export type Arrivals = {
  /** How far the hub has stretched toward its new size, by the relayout's progress. */
  growth: (progress: number) => number;
  /** Each new bucket, source and sink by its id (a bucket's id is its index), and the window it fades in over. */
  windows: ReadonlyMap<string, { start: number; length: number }>;
};

/** The hub stretches over this first share of a relayout; agents then arrive, and sources after them. */
const GROWTH = 0.3;
const FADE = 0.15;
const PHASES = { sinks: 0.2, sources: 0.45 } as const;
const STAGGER = 0.4;

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** How far a window has faded in at `progress`, eased. */
export const arrived = (window: { start: number; length: number } | undefined, progress: number) =>
  window ? ease(Math.min(1, Math.max(0, (progress - window.start) / window.length))) : 1;

/**
 * The order a relayout brings in what it adds: the hub stretches first, each new bucket fading in once it has room;
 * then the agents, and last the sources, each set inner first on both sides at once, so the diagram fills outward.
 */
export const planArrivals = (from: DataFlowLayout, to: DataFlowLayout): Arrivals => {
  const centre = to.hub.frame.x + to.hub.frame.width / 2;
  const windows = new Map<string, { start: number; length: number }>();
  const stagger = (items: { id: string; frame: Rect }[], phase: number) => {
    const distance = (item: { frame: Rect }) => Math.abs(item.frame.x + item.frame.width / 2 - centre);
    const sorted = [...items].sort((a, b) => distance(a) - distance(b));
    // Both sides arrive together, so a rank is shared by the pair at the same distance.
    const ranks = Math.max(1, Math.ceil(sorted.length / 2));
    sorted.forEach((item, index) => {
      const rank = Math.floor(index / 2);
      windows.set(item.id, { start: phase + (ranks > 1 ? (STAGGER * rank) / (ranks - 1) : 0), length: FADE });
    });
  };
  // A new bucket fades in only once the stretching hub has room for it: when the hub's edge has passed the bucket's
  // outer side, found by stepping through the growth.
  const oldBuckets = from.hub.buckets?.length ?? 1;
  const growth = (progress: number) => ease(Math.min(1, progress / GROWTH));
  (to.hub.buckets ?? []).slice(oldBuckets).forEach((bucket, index) => {
    const leftward = bucket.x + bucket.width / 2 < centre;
    const fits = (progress: number) => {
      const reach = growth(progress);
      const left = from.hub.well.x + (to.hub.well.x - from.hub.well.x) * reach;
      const right =
        from.hub.well.x +
        from.hub.well.width +
        (to.hub.well.x + to.hub.well.width - from.hub.well.x - from.hub.well.width) * reach;
      return leftward ? left <= bucket.x : right >= bucket.x + bucket.width;
    };
    let start = 0;
    while (start < GROWTH && !fits(start)) {
      start += 0.005;
    }
    windows.set(`${oldBuckets + index}`, { start, length: FADE });
  });
  stagger(
    to.sinks.filter((sink) => !from.sinks.some(({ id }) => id === sink.id)),
    PHASES.sinks,
  );
  stagger(
    to.sources.filter((source) => !from.sources.some(({ id }) => id === source.id)),
    PHASES.sources,
  );
  return { growth, windows };
};
