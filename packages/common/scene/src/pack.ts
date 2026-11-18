//
// Copyright 2026 DXOS.org
//

//
// The other way a box may place what names it: packing circles into its frame instead of laying them on tracks.
// It is a grid's rule with a different solver — the children are the same boxes, each one given the square its
// circle fits, and the rule is what is stored, so adding a child re-packs the field rather than leaving a hole.
//
// Ported from the studio deck's `packages/substrate/pack.mjs`, which the Hyperspace slide's field was drawn by:
// largest first, because a large circle placed late rarely finds room, and a circle that finds no room in `TRIES`
// is left out rather than overlapped.
//

/** Seeded floats in [0, 1): mulberry32, the generator the deck's own packing used. */
export const rng = (seed: number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A packed circle in the frame's own units. */
export type Circle = { x: number; y: number; r: number };

/** How many positions a circle tries before it is left out. */
const TRIES = 400;

/** What a packing needs of itself, beside the frame it fills. */
export type PackRule = {
  /** The seed the packing is laid out from; the same seed always gives the same field. */
  seed?: number;
  /** The smallest and largest a packed circle may be, in scene units. */
  rmin?: number;
  rmax?: number;
  /** Clearance between two circles, and between a circle and the frame's edge. */
  gap?: number;
};

/**
 * `count` circles packed into `width` x `height`, largest first. A circle that cannot clear the frame's edge at any
 * position is skipped: the interval it samples collapses to a point, which every candidate then passes, and the
 * circle would be drawn over the boundary. Fewer circles is the same outcome as failing every try, and none of
 * them is wrong.
 */
export const packCircles = (rule: PackRule, count: number, width: number, height: number): Circle[] => {
  const { seed = 0, rmin = 16, rmax = 64, gap = 0 } = rule;
  const random = rng(seed);
  const radii = Array.from({ length: Math.max(count, 0) }, () => rmin + random() * Math.max(0, rmax - rmin)).sort(
    (left, right) => right - left,
  );
  const packed: Circle[] = [];
  for (const r of radii) {
    if (width < 2 * (r + gap) || height < 2 * (r + gap)) {
      continue;
    }
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const x = r + gap + random() * Math.max(0, width - 2 * (r + gap));
      const y = r + gap + random() * Math.max(0, height - 2 * (r + gap));
      if (packed.every((other) => Math.hypot(other.x - x, other.y - y) >= other.r + r + gap)) {
        packed.push({ x, y, r });
        break;
      }
    }
  }
  return packed;
};
