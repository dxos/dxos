//
// Copyright 2026 DXOS.org
//

import { rng } from '../../components/Graph/generator/space-graph.generator.ts';

/** A packed space: a circle in the field's own units, or as a fraction of its box. */
export type Circle = { x: number; y: number; r: number };

/**
 * The field's spaces, packed from its seed. Largest first, because a large circle placed late rarely finds room;
 * each takes the first position of `TRIES` that clears every space already placed and the field's edge, and one
 * that finds none is simply not placed — a field whose radii cannot fit shows fewer spaces rather than overlapping
 * ones. Fractions of the field's box, as the stored spaces are, so it scales with the node.
 */
const TRIES = 400;

export const packSpaces = (
  { seed, spaceCount, rmin, rmax, gap }: { seed: number; spaceCount: number; rmin: number; rmax: number; gap: number },
  width: number,
  height: number,
): Circle[] => {
  const random = rng(seed);
  const radii = Array.from({ length: spaceCount }, () => rmin + random() * Math.max(0, rmax - rmin)).sort(
    (left, right) => right - left,
  );
  const packed: Circle[] = [];
  for (const r of radii) {
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const x = r + gap + random() * Math.max(0, width - 2 * (r + gap));
      const y = r + gap + random() * Math.max(0, height - 2 * (r + gap));
      if (packed.every((other) => Math.hypot(other.x - x, other.y - y) >= other.r + r + gap)) {
        packed.push({ x, y, r });
        break;
      }
    }
  }
  return packed.map(({ x, y, r }) => ({ x: x / width, y: y / height, r: r / width }));
};
