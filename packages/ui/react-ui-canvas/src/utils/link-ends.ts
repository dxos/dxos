//
// Copyright 2026 DXOS.org
//

//
// Where a link's ends sit and where its line stops. Every end's outermost point is the anchor on the shape's edge, a
// pointed end's tip a mitred point there; the line stops under the end, so it never shows past or through the point.
// The ends are drawn either as SVG markers (one set per hue, painted over the nodes) or, for a groove, as scene paths:
// a marker is drawn in its own rotated frame, so a lip copy nudged inside it would turn with the link, while the
// groove's lips are offset in the scene's frame.
//

import { type LinkEnds, type Marker, type Point } from '@dxos/scene';

import { flattenPath } from './path.ts';

/** The half-angle at a pointed end's tip: its arms run back 10 and out 5. */
const HALF_ANGLE = Math.atan2(5, 10);
const SIN = Math.sin(HALF_ANGLE);
const TAN = Math.tan(HALF_ANGLE);

/** How far a mitred tip of a stroke `width` wide reaches past its vertex. */
const miter = (width: number) => width / 2 / SIN;

/** The line a link draws: its width and the cap on its ends. */
export type ShaftStroke = { width: number; round: boolean };

/** A marker's box in scene units and in its view units, and where its view puts the anchor. */
export type MarkerFrame = { size: number; view: number; refX: number; refY: number };

/**
 * The frame of an end drawn as a marker, `box` being the end's nominal size and `stroke` its outline's width, both in
 * scene units: the arrow's and triangle's mitred tip and the circle's far side are at the anchor.
 */
export const markerFrame = (marker: Marker, box: number, stroke: number): MarkerFrame => {
  switch (marker) {
    case 'arrow':
    case 'triangle': {
      const size = (box * 12) / 10;
      return { size, view: 12, refX: 10 + miter(stroke) / (size / 12), refY: 5 };
    }
    case 'circle': {
      const size = (box * 10) / 8;
      return { size, view: 10, refX: 9 + stroke / 2 / (size / 10), refY: 5 };
    }
  }
};

/**
 * How far back from the anchor the line stops under an end drawn as a marker: inside the arrow's arms, where its edges
 * meet them; at the triangle's base and the circle's centre, which their canvas fill covers.
 */
export const markerTrim = (marker: Marker, box: number, stroke: number, shaft: ShaftStroke): number => {
  const { size } = markerFrame(marker, box, stroke);
  switch (marker) {
    case 'arrow':
      return miter(stroke) * 2 + shaft.width / 2 / TAN + (shaft.round ? shaft.width / 2 : 0);
    case 'triangle':
      return miter(stroke) + (size / 12) * 10;
    case 'circle':
      return (size / 10) * 4 + stroke / 2;
  }
};

/** A groove head's length for an end `size` long, at least a few channels so it reads as a head. */
const grooveLength = (marker: Marker, width: number, size: number) =>
  marker === 'arrow'
    ? Math.max(size, width * 2.5)
    : marker === 'triangle'
      ? Math.max(size * 1.25, width * 4)
      : Math.max(size / 2, width * 1.5);

/**
 * How far back from the anchor a groove's track stops under its head, where the head's channel covers its round cap:
 * at the arrow's vertex, the triangle's base and the ring's near side.
 */
export const grooveTrim = (marker: Marker, width: number, size: number): number => {
  const length = grooveLength(marker, width, size);
  switch (marker) {
    case 'arrow':
      return miter(width);
    case 'triangle':
      return miter(width) + length;
    case 'circle':
      return length * 2 + width / 2;
  }
};

const round = (value: number) => Math.round(value * 100) / 100;
const at = ({ x, y }: Point) => `${round(x)} ${round(y)}`;

/** The unit direction from the first distinct point of `points` to `tip`. */
const arrival = (points: readonly Point[], tip: Point): Point | undefined => {
  for (const point of points) {
    const dx = tip.x - point.x;
    const dy = tip.y - point.y;
    const length = Math.hypot(dx, dy);
    if (length > 1e-6) {
      return { x: dx / length, y: dy / length };
    }
  }
  return undefined;
};

/**
 * The groove heads for a link's ends, as one path in scene units, stroked as wide as the track with mitred joins: an
 * open chevron for `arrow`, a hollow triangle and a ring for `triangle` and `circle`. A pointed head's mitred tip, and
 * the ring's far side, are at the route's end.
 */
export const grooveHeads = (path: string, ends: LinkEnds, width: number, size: number): string => {
  const points = flattenPath(path)[0] ?? [];
  if (points.length < 2) {
    return '';
  }
  const heads: string[] = [];
  const build = (marker: Marker | undefined, tip: Point, toward: Point | undefined) => {
    if (!marker || !toward) {
      return;
    }
    // In the end's frame: `u` back along the arrival, `v` across it.
    const local = (u: number, v: number): Point => ({
      x: tip.x - toward.x * u - toward.y * v,
      y: tip.y - toward.y * u + toward.x * v,
    });
    const length = grooveLength(marker, width, size);
    switch (marker) {
      case 'arrow': {
        const back = miter(width);
        heads.push(
          `M ${at(local(back + length, length / 2))} L ${at(local(back, 0))} L ${at(local(back + length, -length / 2))}`,
        );
        break;
      }
      case 'triangle': {
        const back = miter(width);
        const corners = [local(back, 0), local(back + length, length / 2), local(back + length, -length / 2)];
        heads.push(`M ${corners.map(at).join(' L ')} Z`);
        break;
      }
      case 'circle': {
        const centre = local(length + width / 2, 0);
        const radius = round(length);
        const side = (sign: number) => at({ x: centre.x + sign * length, y: centre.y });
        heads.push(`M ${side(-1)} A ${radius} ${radius} 0 1 0 ${side(1)} A ${radius} ${radius} 0 1 0 ${side(-1)} Z`);
        break;
      }
    }
  };
  const first = points[0];
  const last = points[points.length - 1];
  build(ends.start, first, arrival(points.slice(1), first));
  build(ends.end, last, arrival([...points].reverse().slice(1), last));
  return heads.join(' ');
};

//
// Trimming.
//

/** A straight, quadratic or cubic piece of a route: its start, its control points and its end. */
type Segment = readonly Point[];

const COMMAND = /([A-Za-z])([^A-Za-z]*)/g;
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const ARITY: Record<string, number> = { L: 2, Q: 4, C: 6 };

/** The route's pieces when it is one run of absolute M, L, Q and C, as the canvas draws routes; otherwise its polyline. */
const segments = (path: string): Segment[] => {
  const parsed: Segment[] = [];
  let start: Point | undefined;
  let current: Point | undefined;
  for (const [, command, args] of path.matchAll(COMMAND)) {
    const numbers = (args.match(NUMBER) ?? []).map(Number);
    const points: Point[] = [];
    for (let index = 0; index + 1 < numbers.length; index += 2) {
      points.push({ x: numbers[index], y: numbers[index + 1] });
    }
    if (command === 'M' && start === undefined && points.length === 1) {
      start = current = points[0];
      continue;
    }
    const arity = ARITY[command];
    if (!current || !arity || points.length !== arity / 2) {
      return polyline(path);
    }
    parsed.push([current, ...points]);
    current = points[points.length - 1];
  }
  return parsed;
};

const polyline = (path: string): Segment[] => {
  const points = flattenPath(path)[0] ?? [];
  return points.slice(1).map((point, index) => [points[index], point]);
};

const lerp = (from: Point, to: Point, t: number): Point => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
});

/** The segment cut at `t` into the part before it and the part after (de Casteljau). */
const split = (segment: Segment, t: number): [Segment, Segment] => {
  const before: Point[] = [segment[0]];
  const after: Point[] = [segment[segment.length - 1]];
  let level: readonly Point[] = segment;
  while (level.length > 1) {
    const next = level.slice(1).map((point, index) => lerp(level[index], point, t));
    before.push(next[0]);
    after.unshift(next[next.length - 1]);
    level = next;
  }
  return [before, after];
};

const SAMPLES = 32;

/** The segment's length along it at evenly spaced `t`. */
const lengths = (segment: Segment): number[] => {
  const steps = segment.length === 2 ? 1 : SAMPLES;
  const result = [0];
  let previous = segment[0];
  for (let step = 1; step <= steps; step++) {
    const point = split(segment, step / steps)[0].at(-1) ?? previous;
    result.push((result.at(-1) ?? 0) + Math.hypot(point.x - previous.x, point.y - previous.y));
    previous = point;
  }
  return result;
};

/** The `t` at which the segment has run `distance` from its start. */
const paramAt = (table: readonly number[], distance: number): number => {
  const steps = table.length - 1;
  for (let step = 1; step <= steps; step++) {
    if (table[step] >= distance) {
      const span = table[step] - table[step - 1];
      return (step - 1 + (span > 0 ? (distance - table[step - 1]) / span : 0)) / steps;
    }
  }
  return 1;
};

/**
 * The route with `start` and `end` scene units cut off its ends along it, so a line stops under the ends drawn there;
 * empty when nothing is left. Curves are cut, not flattened, so the line keeps its shape.
 */
export const trimPath = (path: string, start: number, end: number): string => {
  if (start <= 0 && end <= 0) {
    return path;
  }
  const pieces = segments(path);
  let remaining = Math.max(0, start);
  while (remaining > 0 && pieces.length > 0) {
    const table = lengths(pieces[0]);
    const length = table.at(-1) ?? 0;
    if (length <= remaining) {
      remaining -= length;
      pieces.shift();
    } else {
      pieces[0] = split(pieces[0], paramAt(table, remaining))[1];
      remaining = 0;
    }
  }
  remaining = Math.max(0, end);
  while (remaining > 0 && pieces.length > 0) {
    const last = pieces.length - 1;
    const table = lengths(pieces[last]);
    const length = table.at(-1) ?? 0;
    if (length <= remaining) {
      remaining -= length;
      pieces.pop();
    } else {
      pieces[last] = split(pieces[last], paramAt(table, length - remaining))[0];
      remaining = 0;
    }
  }
  if (pieces.length === 0) {
    return '';
  }
  const command = (segment: Segment) =>
    `${segment.length === 2 ? 'L' : segment.length === 3 ? 'Q' : 'C'} ${segment.slice(1).map(at).join(', ')}`;
  return [`M ${at(pieces[0][0])}`, ...pieces.map(command)].join(' ');
};
