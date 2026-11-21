//
// Copyright 2026 DXOS.org
//

//
// The other way a box may place what names it: packing circles into its frame instead of laying them on tracks.
// It is a grid's rule with a different solver — the children are the same boxes, each one given the square its
// circle fits, and the rule is what is stored, so adding a child re-packs the field rather than leaving a hole.
//
// Ported from the studio deck's `packages/substrate/pack.mjs`, which the Hyperspace slide's field was drawn by:
// largest first, because a large circle placed late rarely finds room. The deck left out a circle that found no
// room in `TRIES`; here the field is packed again smaller, since each circle is a box something may connect to.
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

/** How many positions a circle tries in one pass. */
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

/** How many times a crowded field pushes its circles apart before an arrangement is given up on. */
const RELAX_STEPS = 400;

/** How many starting arrangements one size of a crowded field is tried from. */
const RELAX_STARTS = 4;

/** How many times the search for the largest size that fits halves its range: one part in 16,000. */
const SEARCH_STEPS = 14;

/** How far two circles may still reach into the gap between them when an arrangement is taken, in scene units. */
const SLACK = 0.5;

/**
 * The radius each entry of `sizes` asks for: half the diameter it states, or one the seed draws, the largest to the
 * first entry that states none.
 */
const radiiOf = (rule: PackRule, sizes: readonly (number | undefined)[], random: () => number): number[] => {
  const { rmin = 16, rmax = 64 } = rule;
  const drawn = sizes
    .filter((size) => size === undefined)
    .map(() => rmin + random() * Math.max(0, rmax - rmin))
    .sort((left, right) => right - left);
  let next = 0;
  return sizes.map((size) => (size === undefined ? drawn[next++] : size / 2));
};

/**
 * The circles scattered: each dropped at a random place that clears the ones before it, largest first, which is
 * the look of a field with room to spare. A circle that finds no place in `TRIES` is left out.
 */
const scatter = (
  rule: PackRule,
  sizes: readonly (number | undefined)[],
  width: number,
  height: number,
): (Circle | undefined)[] => {
  const { seed = 0, gap = 0 } = rule;
  const random = rng(seed);
  const circles = radiiOf(rule, sizes, random)
    .map((r, index) => ({ index, r }))
    .sort((left, right) => right.r - left.r);
  const packed: Circle[] = [];
  const placed: (Circle | undefined)[] = sizes.map(() => undefined);
  for (const { index, r } of circles) {
    // A circle that cannot clear the frame's edge samples an interval collapsed to a point, which every candidate
    // then passes, and it would be drawn over the boundary.
    if (width < 2 * (r + gap) || height < 2 * (r + gap)) {
      continue;
    }
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const x = r + gap + random() * Math.max(0, width - 2 * (r + gap));
      const y = r + gap + random() * Math.max(0, height - 2 * (r + gap));
      if (packed.every((other) => Math.hypot(other.x - x, other.y - y) >= other.r + r + gap)) {
        packed.push({ x, y, r });
        placed[index] = { x, y, r };
        break;
      }
    }
  }
  return placed;
};

/**
 * The circles pushed apart: dropped anywhere, then every pair that is too close moved off each other and back
 * inside the frame, again and again until none is. Where a scatter leaves a crowded field half empty, this finds
 * the arrangements in which the circles nearly touch. Gives nothing when they do not come apart.
 */
const relax = (
  radii: readonly number[],
  width: number,
  height: number,
  gap: number,
  random: () => number,
): Circle[] | undefined => {
  if (radii.some((r) => width < 2 * (r + gap) || height < 2 * (r + gap))) {
    return undefined;
  }
  const clamp = (value: number, r: number, extent: number) => Math.min(Math.max(value, r + gap), extent - r - gap);
  const circles = radii.map((r) => ({
    r,
    x: r + gap + random() * (width - 2 * (r + gap)),
    y: r + gap + random() * (height - 2 * (r + gap)),
  }));
  // Measured where the circles stand, inside the frame, before any is moved: what is returned is what was measured.
  const overlapOf = (a: Circle, b: Circle) => a.r + b.r + gap - Math.hypot(b.x - a.x, b.y - a.y);
  for (let step = 0; step < RELAX_STEPS; step++) {
    let worst = 0;
    for (let left = 0; left < circles.length; left++) {
      for (let right = left + 1; right < circles.length; right++) {
        worst = Math.max(worst, overlapOf(circles[left], circles[right]));
      }
    }
    if (worst <= SLACK) {
      return circles;
    }
    for (let left = 0; left < circles.length; left++) {
      for (let right = left + 1; right < circles.length; right++) {
        const a = circles[left];
        const b = circles[right];
        const overlap = overlapOf(a, b);
        if (overlap <= 0) {
          continue;
        }
        // Two circles on one point have no line to part along, so they take any.
        const apart = b.x !== a.x || b.y !== a.y;
        const angle = apart ? Math.atan2(b.y - a.y, b.x - a.x) : random() * 2 * Math.PI;
        // The smaller of the two gives way further, so a large circle is not shoved about by the small ones.
        const share = b.r / (a.r + b.r);
        a.x -= Math.cos(angle) * overlap * share;
        a.y -= Math.sin(angle) * overlap * share;
        b.x += Math.cos(angle) * overlap * (1 - share);
        b.y += Math.sin(angle) * overlap * (1 - share);
      }
    }
    for (const circle of circles) {
      circle.x = clamp(circle.x, circle.r, width);
      circle.y = clamp(circle.y, circle.r, height);
    }
  }
  return undefined;
};

/** One size of a crowded field, tried from several starting arrangements; the seed fixes every one of them. */
const relaxAt = (
  rule: PackRule,
  sizes: readonly (number | undefined)[],
  width: number,
  height: number,
  scale: number,
): Circle[] | undefined => {
  const { seed = 0, gap = 0 } = rule;
  for (let start = 0; start < RELAX_STARTS; start++) {
    const random = rng(seed + start * 7919);
    const radii = radiiOf(rule, sizes, rng(seed)).map((r) => r * scale);
    const circles = relax(radii, width, height, gap, random);
    if (circles) {
      return circles;
    }
  }
  return undefined;
};

/**
 * A circle per entry of `sizes`, packed into `width` x `height`; an entry is a diameter the circle states, or
 * `undefined` for one the seed draws. Sizes that fit are scattered as they are. Sizes that do not are all drawn
 * smaller by one factor, stated ones included, at the largest that fits with the circles pushed up against each
 * other: so asking for more than the frame holds is how a field is filled, and every member is always placed. A
 * member left out would have no frame, be drawn at the origin, and take every connector to it there. Only a frame
 * no circle can enter leaves any out.
 */
export const packCircles = (
  rule: PackRule,
  sizes: readonly (number | undefined)[],
  width: number,
  height: number,
): (Circle | undefined)[] => {
  const scattered = scatter(rule, sizes, width, height);
  if (scattered.every((circle) => circle !== undefined)) {
    return scattered;
  }
  const whole = relaxAt(rule, sizes, width, height, 1);
  if (whole) {
    return whole;
  }
  let fitted: Circle[] | undefined;
  for (let step = 0, low = 0, high = 1; step < SEARCH_STEPS; step++) {
    const scale = (low + high) / 2;
    const circles = relaxAt(rule, sizes, width, height, scale);
    if (circles) {
      fitted = circles;
      low = scale;
    } else {
      high = scale;
    }
  }
  return fitted ?? scattered;
};
