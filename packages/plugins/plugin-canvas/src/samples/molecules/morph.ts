//
// Copyright 2026 DXOS.org
//

import { type Block, type Rect } from './layout.ts';
import { type Body, type LatticeBond } from './simulation.ts';

/** A one-bucket hub part way to its partitioned `target`: `progress` runs from 0 (as laid out) to 1 (the target). */
export type HubMorph = { target: Block; progress: number };

type Point = { x: number; y: number };

const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

const mixRect = (from: Rect, to: Rect, progress: number): Rect => ({
  x: mix(from.x, to.x, progress),
  y: mix(from.y, to.y, progress),
  width: mix(from.width, to.width, progress),
  height: mix(from.height, to.height, progress),
});

/** Where each of the target's buckets starts: the well cut into equal pieces with no frame between them. */
const startBuckets = (hub: Block, { target }: HubMorph): Rect[] => {
  const { well } = hub;
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

  const middle = hub.well.x + hub.well.width / 2;
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
  const lift = Math.round((centre.y + centre.height / 2 - (hub.well.y + hub.well.height / 2)) / rise) * rise;
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
