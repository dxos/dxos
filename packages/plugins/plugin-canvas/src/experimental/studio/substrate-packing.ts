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

/**
 * A packed space as text: `x,y,r`, spaces apart, each a fraction of the field's box rounded to four places. The
 * DSL carries no list and no nested object, so a kind whose field is a list of simple records writes it as one
 * scalar and reads it back itself — the spelling `scene-model.ts` already uses for `points="0,0.5 1,0.5"`. The
 * knowledge of the shape stays with the plugin that owns the kind, which is where it belongs.
 */
const round = (value: number): number => Math.round(value * 1e4) / 1e4;

export const formatSpaces = (spaces: readonly Circle[]): string =>
  spaces.map(({ x, y, r }) => `${round(x)},${round(y)},${round(r)}`).join(' ');

export const parseSpaces = (value: string): Circle[] =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((entry) => {
      const [x, y, r] = entry.split(',').map(Number);
      return [x, y, r].every(Number.isFinite) ? [{ x, y, r }] : [];
    });

/** A lit object as text: `x,y,tone`, or `x,y` where it has no tone of its own. */
export type LitPoint = { x: number; y: number; tone?: string };

export const formatLit = (lit: readonly LitPoint[]): string =>
  lit.map(({ x, y, tone }) => `${round(x)},${round(y)}${tone ? `,${tone}` : ''}`).join(' ');

export const parseLit = (value: string): LitPoint[] =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((entry) => {
      const [x, y, tone] = entry.split(',');
      const [px, py] = [Number(x), Number(y)];
      return Number.isFinite(px) && Number.isFinite(py) ? [{ x: px, y: py, ...(tone ? { tone } : {}) }] : [];
    });
