import { type Bounds, type Point } from '@dxos/scene';
//
// Copyright 2026 DXOS.org
//

//
// SVG path data as geometry, without a DOM: a generator's worker has no `getPointAtLength`, and a link's route or a
// logo's outline is path data. Paths are flattened to polylines once; length and points along them are measured on
// the polyline.
//

/** Segments a curve is cut into when flattened; enough that the error is far under a pixel at the sizes drawn. */
const CURVE_STEPS = 16;

const COMMAND = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/**
 * The path's subpaths as polylines, curves flattened. Supports the commands the canvas emits and common art uses: M, L,
 * H, V, C, S, Q, T, A and Z, absolute and relative, with implicit repeats.
 */
export const flattenPath = (d: string): Point[][] => {
  const subpaths: Point[][] = [];
  let current: Point[] = [];
  let at: Point = { x: 0, y: 0 };
  let start: Point = at;
  let control: Point | undefined;
  let previous = '';
  const cubic = (c1: Point, c2: Point, end: Point) => {
    const from = at;
    for (let step = 1; step <= CURVE_STEPS; step++) {
      const t = step / CURVE_STEPS;
      const u = 1 - t;
      current.push({
        x: u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * end.x,
        y: u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * end.y,
      });
    }
  };
  const quadratic = (c: Point, end: Point) => {
    const from = at;
    for (let step = 1; step <= CURVE_STEPS; step++) {
      const t = step / CURVE_STEPS;
      const u = 1 - t;
      current.push({
        x: u * u * from.x + 2 * u * t * c.x + t * t * end.x,
        y: u * u * from.y + 2 * u * t * c.y + t * t * end.y,
      });
    }
  };
  // An arc from where the path is to `end`, by the centre SVG derives from its two ends (SVG 1.1, F.6.5).
  const arc = (rx: number, ry: number, turn: number, large: boolean, sweep: boolean, end: Point) => {
    const from = at;
    if (rx === 0 || ry === 0 || (from.x === end.x && from.y === end.y)) {
      current.push(end);
      return;
    }
    const phi = (turn * Math.PI) / 180;
    const [cos, sin] = [Math.cos(phi), Math.sin(phi)];
    const [dx, dy] = [(from.x - end.x) / 2, (from.y - end.y) / 2];
    const [x1, y1] = [cos * dx + sin * dy, -sin * dx + cos * dy];
    // Radii too small to span the two ends are scaled up until they do.
    const reach = Math.sqrt((x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry));
    const [radiusX, radiusY] = [Math.abs(rx) * Math.max(1, reach), Math.abs(ry) * Math.max(1, reach)];
    const over = radiusX * radiusX * y1 * y1 + radiusY * radiusY * x1 * x1;
    const under = Math.max(0, radiusX * radiusX * radiusY * radiusY - over);
    const side = (large === sweep ? -1 : 1) * Math.sqrt(under / over);
    const [cx1, cy1] = [(side * radiusX * y1) / radiusY, (-side * radiusY * x1) / radiusX];
    const centre = {
      x: cos * cx1 - sin * cy1 + (from.x + end.x) / 2,
      y: sin * cx1 + cos * cy1 + (from.y + end.y) / 2,
    };
    const angleOf = (x: number, y: number) => Math.atan2(y / radiusY, x / radiusX);
    const first = angleOf(x1 - cx1, y1 - cy1);
    let swept = angleOf(-x1 - cx1, -y1 - cy1) - first;
    if (sweep && swept < 0) {
      swept += 2 * Math.PI;
    } else if (!sweep && swept > 0) {
      swept -= 2 * Math.PI;
    }
    // As many steps as a full turn takes four curves' worth of, so a short arc is not over-cut.
    const steps = Math.max(1, Math.ceil((Math.abs(swept) / (Math.PI / 2)) * CURVE_STEPS));
    for (let step = 1; step < steps; step++) {
      const angle = first + (swept * step) / steps;
      const [x, y] = [radiusX * Math.cos(angle), radiusY * Math.sin(angle)];
      current.push({ x: centre.x + cos * x - sin * y, y: centre.y + sin * x + cos * y });
    }
    current.push(end);
  };
  for (const [, letter, args] of d.matchAll(COMMAND)) {
    const numbers = (args.match(NUMBER) ?? []).map(Number);
    const relative = letter === letter.toLowerCase();
    const command = letter.toUpperCase();
    const point = (x: number, y: number): Point => (relative ? { x: at.x + x, y: at.y + y } : { x, y });
    const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }[command] ?? 0;
    if (command === 'Z') {
      current.push(start);
      at = start;
      subpaths.push(current);
      current = [];
      control = undefined;
      previous = 'Z';
      continue;
    }
    for (let index = 0; index + arity <= numbers.length && arity > 0; index += arity) {
      const n = numbers.slice(index, index + arity);
      // A moveto's repeats are linetos.
      const effective = command === 'M' && index > 0 ? 'L' : command;
      switch (effective) {
        case 'M':
          if (current.length > 1) {
            subpaths.push(current);
          }
          at = point(n[0], n[1]);
          start = at;
          current = [at];
          control = undefined;
          break;
        case 'L':
          at = point(n[0], n[1]);
          current.push(at);
          control = undefined;
          break;
        case 'H':
          at = { x: relative ? at.x + n[0] : n[0], y: at.y };
          current.push(at);
          control = undefined;
          break;
        case 'V':
          at = { x: at.x, y: relative ? at.y + n[0] : n[0] };
          current.push(at);
          control = undefined;
          break;
        case 'C': {
          const c1 = point(n[0], n[1]);
          const c2 = point(n[2], n[3]);
          const end = point(n[4], n[5]);
          cubic(c1, c2, end);
          control = c2;
          at = end;
          break;
        }
        case 'S': {
          const c1 = control && /[CS]/i.test(previous) ? { x: 2 * at.x - control.x, y: 2 * at.y - control.y } : at;
          const c2 = point(n[0], n[1]);
          const end = point(n[2], n[3]);
          cubic(c1, c2, end);
          control = c2;
          at = end;
          break;
        }
        case 'Q': {
          const c = point(n[0], n[1]);
          const end = point(n[2], n[3]);
          quadratic(c, end);
          control = c;
          at = end;
          break;
        }
        case 'T': {
          const c = control && /[QT]/i.test(previous) ? { x: 2 * at.x - control.x, y: 2 * at.y - control.y } : at;
          const end = point(n[0], n[1]);
          quadratic(c, end);
          control = c;
          at = end;
          break;
        }
        case 'A': {
          const end = point(n[5], n[6]);
          arc(n[0], n[1], n[2], n[3] !== 0, n[4] !== 0, end);
          control = undefined;
          at = end;
          break;
        }
      }
      previous = effective;
    }
  }
  if (current.length > 1) {
    subpaths.push(current);
  }
  return subpaths;
};

/** The box a path's flattened outline fills, or undefined for an empty path. */
export const pathBounds = (d: string): Bounds | undefined => {
  const points = flattenPath(d).flat();
  if (points.length === 0) {
    return undefined;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

/** A polyline measured for walking along: cumulative length at each vertex. */
export type Polyline = { points: readonly Point[]; lengths: readonly number[]; length: number };

export const measure = (points: readonly Point[]): Polyline => {
  const lengths = [0];
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    lengths.push(lengths[index - 1] + Math.hypot(to.x - from.x, to.y - from.y));
  }
  return { points, lengths, length: lengths[lengths.length - 1] ?? 0 };
};

/** The point `distance` along the polyline (clamped to its ends), and the direction of travel there in radians. */
export const pointAlong = (polyline: Polyline, distance: number): { position: Point; angle: number } => {
  const { points, lengths, length } = polyline;
  if (points.length === 0) {
    return { position: { x: 0, y: 0 }, angle: 0 };
  }
  if (points.length === 1) {
    return { position: points[0], angle: 0 };
  }
  const target = Math.min(length, Math.max(0, distance));
  let index = 1;
  while (index < lengths.length - 1 && lengths[index] < target) {
    index++;
  }
  const from = points[index - 1];
  const to = points[index];
  const span = lengths[index] - lengths[index - 1];
  const amount = span > 0 ? (target - lengths[index - 1]) / span : 0;
  return {
    position: { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount },
    angle: Math.atan2(to.y - from.y, to.x - from.x),
  };
};
