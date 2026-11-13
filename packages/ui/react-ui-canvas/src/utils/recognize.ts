//
// Copyright 2026 DXOS.org
//

//
// Recognising a shape in a stroke drawn freehand. A stroke that comes back to where it began is compared with each
// shape the canvas can draw in its place, laid over the stroke's own bounds: the one it lies closest to, if it is
// close enough, is the shape meant. The measure runs both ways (the stroke to the shape, and the shape to the stroke),
// so a scribble along one side of its bounds is no rectangle.
//
// A stroke is also read as the segments it was drawn in. The hand slows where one ends and the next begins, so the
// samples' times say where the corners are; each run between two of them is a straight line or, where it bows, a
// parabola. The segments say which shapes the stroke may be, and are what lands where it is none of them.
//

import { type Bounds, type Point, type PolylineBend, type Size } from '@dxos/scene';

import { parabolaPoint } from './polyline.ts';

/** A shape a stroke was read as, and the box it was drawn in. */
export type RecognizedShape = {
  shape: 'rect' | 'ellipse' | 'triangle' | 'diamond';
  bounds: Bounds;
  /** Degrees clockwise a triangle's point is turned from the top; unset, it points up. */
  rotation?: 90 | 180 | 270;
};

/** A stroke shorter than this many samples says too little to read. */
const MIN_POINTS = 8;

/** How far from its start a stroke may end and still count as closed, as a share of its bounds' diagonal. */
const CLOSURE = 0.25;

/** How far off a shape's outline a stroke may lie on average and still be that shape, as a share of the diagonal. */
const TOLERANCE = 0.045;

/** How far each side of a drawn shape may be from a known size's and still be meant as it, as a share of that side. */
const SIZE_TOLERANCE = 0.25;

/**
 * `size`, or the first of `known` it is close to on both sides. A shape drawn by hand is the size the hand happened
 * to make it: one nearly the size of the last such shape, or of the tool's own, was meant to match it.
 */
export const nearestSize = (size: Size, known: readonly (Size | undefined)[], tolerance = SIZE_TOLERANCE): Size =>
  known.find(
    (candidate): candidate is Size =>
      candidate !== undefined &&
      Math.abs(size.width - candidate.width) <= tolerance * candidate.width &&
      Math.abs(size.height - candidate.height) <= tolerance * candidate.height,
  ) ?? size;

/**
 * `value` on the grid, a major line where one is within a minor cell of it and the nearest minor line otherwise. A
 * shape read from a stroke is squared up, and a hand aiming at a heavy line of the grid lands near it, not on it.
 */
export const favorMajor = (value: number, minor: number, major: number): number => {
  const heavy = Math.round(value / major) * major;
  return Math.abs(value - heavy) <= minor ? heavy : Math.round(value / minor) * minor;
};

/** Points along a shape's outline the stroke is checked against. */
const OUTLINE_SAMPLES = 64;

/** How finely an ellipse is drawn as a polygon to measure against. */
const ELLIPSE_SIDES = 48;

const distance = (from: Point, to: Point): number => Math.hypot(to.x - from.x, to.y - from.y);

/** How far `point` is from the segment between `from` and `to`. */
const toSegment = (point: Point, from: Point, to: Point): number => {
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  const length = dx * dx + dy * dy;
  const along =
    length === 0 ? 0 : Math.min(1, Math.max(0, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length));
  return distance(point, { x: from.x + along * dx, y: from.y + along * dy });
};

/** How far `point` is from a closed line through `ring`. */
const toRing = (point: Point, ring: readonly Point[]): number =>
  Math.min(...ring.map((vertex, index) => toSegment(point, vertex, ring[(index + 1) % ring.length])));

/** `count` points spaced evenly along a closed line through `ring`. */
const alongRing = (ring: readonly Point[], count: number): Point[] => {
  const edges = ring.map((vertex, index) => ({ from: vertex, to: ring[(index + 1) % ring.length] }));
  const lengths = edges.map(({ from, to }) => distance(from, to));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return Array.from({ length: count }, (_, index) => {
    let travel = (index / count) * total;
    const edge = lengths.findIndex((length) => {
      if (travel <= length) {
        return true;
      }
      travel -= length;
      return false;
    });
    const { from, to } = edges[Math.max(edge, 0)];
    const share = lengths[Math.max(edge, 0)] === 0 ? 0 : travel / lengths[Math.max(edge, 0)];
    return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
  });
};

const mean = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

const boundsOf = (points: readonly Point[]): Bounds => {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
};

/** Each shape a stroke may be, as the closed line it draws in `bounds`. */
const candidates = ({ x, y, width, height }: Bounds): (Omit<RecognizedShape, 'bounds'> & { ring: Point[] })[] => {
  const [right, bottom] = [x + width, y + height];
  const [midX, midY] = [x + width / 2, y + height / 2];
  const [nw, ne, se, sw] = [
    { x, y },
    { x: right, y },
    { x: right, y: bottom },
    { x, y: bottom },
  ];
  const [north, east, south, west] = [
    { x: midX, y },
    { x: right, y: midY },
    { x: midX, y: bottom },
    { x, y: midY },
  ];
  return [
    { shape: 'rect', ring: [nw, ne, se, sw] },
    {
      shape: 'ellipse',
      ring: Array.from({ length: ELLIPSE_SIDES }, (_, index) => {
        const angle = (index / ELLIPSE_SIDES) * 2 * Math.PI;
        return { x: midX + (width / 2) * Math.cos(angle), y: midY + (height / 2) * Math.sin(angle) };
      }),
    },
    { shape: 'diamond', ring: [north, east, south, west] },
    { shape: 'triangle', ring: [north, se, sw] },
    { shape: 'triangle', rotation: 90, ring: [east, sw, nw] },
    { shape: 'triangle', rotation: 180, ring: [south, nw, ne] },
    { shape: 'triangle', rotation: 270, ring: [west, ne, se] },
  ];
};

/**
 * The shape a stroke through `points` draws, or none: a stroke left open, one too short or too small to read, and one
 * that lies near no shape's outline are all a line and nothing more. `minimum` is the smallest side worth a shape.
 */
export const recognizeShape = (
  points: readonly Point[],
  minimum = 0,
  only?: readonly RecognizedShape['shape'][],
  tolerance = TOLERANCE,
): RecognizedShape | undefined => {
  if (points.length < MIN_POINTS) {
    return undefined;
  }
  const bounds = boundsOf(points);
  const diagonal = Math.hypot(bounds.width, bounds.height);
  if (bounds.width < minimum || bounds.height < minimum || diagonal === 0) {
    return undefined;
  }
  if (distance(points[0], points[points.length - 1]) > CLOSURE * diagonal) {
    return undefined;
  }
  const scored = candidates(bounds)
    .filter(({ shape }) => only === undefined || only.includes(shape))
    .map(({ ring, ...shape }) => {
      const drawn = mean(points.map((point) => toRing(point, ring)));
      const covered = mean(alongRing(ring, OUTLINE_SAMPLES).map((point) => toRing(point, points)));
      return { shape, error: (drawn + covered) / 2 / diagonal };
    });
  if (scored.length === 0) {
    return undefined;
  }
  const best = scored.reduce((least, candidate) => (candidate.error < least.error ? candidate : least));
  return best.error <= tolerance ? { ...best.shape, bounds } : undefined;
};

/** A stroke read as the segments it was drawn in: straight from each point to the next, but for those `bends` name. */
export type RecognizedPath = { points: Point[]; bends: PolylineBend[]; closed: boolean };

/** What a stroke was read as: a shape the canvas draws, or the segments it runs in. */
export type StrokeReading = { kind: 'shape'; shape: RecognizedShape } | { kind: 'path'; path: RecognizedPath };

/** How slow the hand is, as a share of its usual speed over the stroke, where it is pausing. */
const PAUSE_SPEED = 0.35;

/** Samples either side of one that its speed is taken over, which a single late pointer event would otherwise set. */
const SPEED_WINDOW = 1;

/** How far apart two breaks in a stroke are at the least, as a share of its length: nearer, they are one corner. */
const MIN_RUN = 0.06;

/** How far off the line between its ends a run may lie and still be straight, as a share of its length. */
const LINE_TOLERANCE = 0.06;

/** How far off a parabola between its ends a run may lie and still be one curve, as a share of its length. */
const CURVE_TOLERANCE = 0.05;

/** How many times a run that is neither is split where it turns most, to find a corner the hand did not stop at. */
const MAX_SPLITS = 3;

/** More segments than this and the stroke is a scribble, which is better left the line it was drawn as. */
const MAX_SEGMENTS = 8;

/** How little a stroke turns, in radians, where it runs on through a break rather than round a corner. */
const STRAIGHT_TURN = (25 * Math.PI) / 180;

/** How far a bow's peak may be from the middle of its run, as a share of the run, and still be meant as centred. */
const CENTERED = 0.2;

/** How loosely a stroke drawn in the right number of segments may follow a shape and still be it. */
const SEGMENTED_TOLERANCE = 0.07;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)];
};

/** How far along the stroke each of `points` is. */
const travelled = (points: readonly Point[]): number[] => {
  const travel = [0];
  for (let index = 1; index < points.length; index++) {
    travel.push(travel[index - 1] + distance(points[index - 1], points[index]));
  }
  return travel;
};

/**
 * Where the pointer paused along a stroke: the indices of the samples it rested at, the ends left out. `times` are
 * when each of `points` was sampled, in ms. A stroke is sampled by distance, so a pause is not a run of samples in
 * one place but a long wait before the next one; the hand also slows into a corner it does not stop at, which reads
 * the same. No times, or none that differ, and there is nothing to read.
 */
export const strokePauses = (points: readonly Point[], times: readonly number[]): number[] => {
  if (times.length !== points.length || points.length < MIN_POINTS) {
    return [];
  }
  const travel = travelled(points);
  const length = travel[travel.length - 1];
  // The speed over each step, from the sample of the same index to the next, taken across its neighbours.
  const speeds = points.slice(1).map((_, step) => {
    const [from, to] = [Math.max(0, step - SPEED_WINDOW), Math.min(points.length - 1, step + 1 + SPEED_WINDOW)];
    return (travel[to] - travel[from]) / Math.max(times[to] - times[from], 1);
  });
  const usual = median(speeds);
  if (length === 0 || usual === 0) {
    return [];
  }
  // Each run of slow steps is one pause, at the sample its longest wait began from.
  const pauses: { index: number; wait: number }[] = [];
  let slowest: { index: number; wait: number } | undefined;
  speeds.forEach((speed, step) => {
    if (speed < PAUSE_SPEED * usual) {
      const wait = times[step + 1] - times[step];
      slowest = slowest === undefined || wait > slowest.wait ? { index: step, wait } : slowest;
    } else if (slowest !== undefined) {
      pauses.push(slowest);
      slowest = undefined;
    }
  });
  // A stroke that ends slow ends in a pause, which is its end and not a break in it.
  const apart = MIN_RUN * length;
  const kept: { index: number; wait: number }[] = [];
  for (const pause of pauses) {
    if (travel[pause.index] < apart || length - travel[pause.index] < apart) {
      continue;
    }
    const last = kept[kept.length - 1];
    if (last !== undefined && travel[pause.index] - travel[last.index] < apart) {
      // Two breaks too near to be two corners: the longer wait is where the hand stopped.
      pause.wait > last.wait && (kept[kept.length - 1] = pause);
      continue;
    }
    kept.push(pause);
  }
  return kept.map(({ index }) => index);
};

/** One segment of a stroke: straight, or a parabola about `control`. */
type Segment = { from: Point; to: Point; control?: Point };

/** How finely a parabola is walked to find the point of it nearest a sample. */
const CURVE_SAMPLES = 48;

/** How many times a fit is redone with each sample set against the point of the last fit nearest it. */
const REFITS = 4;

/**
 * The control of the parabola from the first of `run` to the last that lies nearest the rest (least squares), each
 * sample taken to be `shares[index]` of the way along it.
 */
const fitControl = (run: readonly Point[], shares: readonly number[]): Point => {
  const [head, tail] = [run[0], run[run.length - 1]];
  let [sumX, sumY, weight] = [0, 0, 0];
  run.forEach((point, index) => {
    const share = shares[index];
    const pull = 2 * share * (1 - share);
    sumX += pull * (point.x - (1 - share) ** 2 * head.x - share ** 2 * tail.x);
    sumY += pull * (point.y - (1 - share) ** 2 * head.y - share ** 2 * tail.y);
    weight += pull * pull;
  });
  return weight === 0 ? { x: (head.x + tail.x) / 2, y: (head.y + tail.y) / 2 } : { x: sumX / weight, y: sumY / weight };
};

/** The samples from `from` to `to` as one segment where they lie near one, and where they turn most otherwise. */
const fitOne = (
  points: readonly Point[],
  from: number,
  to: number,
): { segment: Segment; fits: boolean; turn: number } => {
  const run = points.slice(from, to + 1);
  const [head, tail] = [run[0], run[run.length - 1]];
  const travel = travelled(run);
  const total = travel[travel.length - 1];
  const reach = run.map((point) => toSegment(point, head, tail));
  // Where the run is furthest from the line between its ends: the corner, if it has one.
  const far = reach.reduce((furthest, value, index) => (value > reach[furthest] ? index : furthest), 0);
  const turn = from + Math.min(Math.max(far, 1), run.length - 2);
  if (run.length <= 2 || total === 0 || reach[far] <= LINE_TOLERANCE * total) {
    return { segment: { from: head, to: tail }, fits: true, turn };
  }
  // How far along the run a sample is says where on the curve it lies only roughly, and badly on a deep bow: each
  // refit sets the samples against the points of the last curve nearest them.
  let shares = travel.map((value) => value / total);
  let control = fitControl(run, shares);
  let walked: Point[] = [];
  for (let pass = 0; pass <= REFITS; pass++) {
    const curve = Array.from({ length: CURVE_SAMPLES + 1 }, (_, step) =>
      parabolaPoint(head, control, tail, step / CURVE_SAMPLES),
    );
    walked = curve;
    if (pass === REFITS) {
      break;
    }
    shares = run.map((point, index) => {
      // The ends are the curve's own.
      if (index === 0 || index === run.length - 1) {
        return index === 0 ? 0 : 1;
      }
      const nearest = curve.reduce(
        (least, at, step) => (distance(point, at) < distance(point, curve[least]) ? step : least),
        0,
      );
      return nearest / CURVE_SAMPLES;
    });
    control = fitControl(run, shares);
  }
  const error = Math.max(
    ...run.map((point) => Math.min(...walked.slice(1).map((at, step) => toSegment(point, walked[step], at)))),
  );
  return { segment: { from: head, to: tail, control }, fits: error <= CURVE_TOLERANCE * total, turn };
};

/** The samples from `from` to `to` as segments: one where they lie near one, else split where they turn most. */
const fitRun = (points: readonly Point[], from: number, to: number, splits = MAX_SPLITS): Segment[] => {
  const { segment, fits, turn } = fitOne(points, from, to);
  if (fits || splits === 0 || to - from < 4) {
    return [segment];
  }
  return [...fitRun(points, from, turn, splits - 1), ...fitRun(points, turn, to, splits - 1)];
};

/** How far the stroke turns at the sample `index`, in radians, read a few samples either side of it. */
const turnAt = (points: readonly Point[], index: number): number => {
  const reach = Math.max(2, Math.round(points.length * 0.04));
  const [before, at, after] = [
    points[Math.max(0, index - reach)],
    points[index],
    points[Math.min(points.length - 1, index + reach)],
  ];
  return turnBetween(before, at, after);
};

/** The angle between the way from `before` to `at` and the way on to `after`. */
const turnBetween = (before: Point, at: Point, after: Point): number => {
  const [inX, inY, outX, outY] = [at.x - before.x, at.y - before.y, after.x - at.x, after.y - at.y];
  const lengths = Math.hypot(inX, inY) * Math.hypot(outX, outY);
  return lengths === 0 ? 0 : Math.acos(Math.max(-1, Math.min(1, (inX * outX + inY * outY) / lengths)));
};

/** How far off level or upright a straight segment may run, in radians, and still be meant as level or upright. */
const ORTHOGONAL = (15 * Math.PI) / 180;

/**
 * `corners` with each straight segment that runs nearly level made level, and each nearly upright made upright: a
 * line drawn by hand leans, and one drawn across or down the page was meant square to it. Segment `index` runs from
 * the corner of that index to the next (the last of a closed line, back to the first), and `straight` says which do.
 * Corners joined by a run of such segments share the one line, at the middle of where they were drawn, so the grid
 * then moves them together.
 */
const squared = (corners: readonly Point[], straight: readonly boolean[]): Point[] => {
  // Each corner's column and row, which a segment square to the page makes one with its other end's.
  const columns = corners.map((_, index) => index);
  const rows = corners.map((_, index) => index);
  const root = (groups: number[], index: number): number =>
    groups[index] === index ? index : (groups[index] = root(groups, groups[index]));
  straight.forEach((isStraight, index) => {
    const [from, to] = [index, (index + 1) % corners.length];
    if (!isStraight || from === to) {
      return;
    }
    const [dx, dy] = [Math.abs(corners[to].x - corners[from].x), Math.abs(corners[to].y - corners[from].y)];
    if (dx <= Math.tan(ORTHOGONAL) * dy) {
      columns[root(columns, from)] = root(columns, to);
    } else if (dy <= Math.tan(ORTHOGONAL) * dx) {
      rows[root(rows, from)] = root(rows, to);
    }
  });
  const shared = (groups: number[], index: number, read: (point: Point) => number): number =>
    mean(corners.filter((_, other) => root(groups, other) === root(groups, index)).map(read));
  const xs = aligned(corners.map((_, index) => shared(columns, index, ({ x }) => x)));
  const ys = aligned(corners.map((_, index) => shared(rows, index, ({ y }) => y)));
  return corners.map((_, index) => ({ x: xs[index], y: ys[index] }));
};

/** How near two corners are on one axis, as a share of the line's extent on it, and still meant to be in line. */
const ALIGNED = 0.1;

/**
 * `values` (each corner's place on one axis) with those that are nearly the same made the same, at their middle: two
 * corners drawn almost level were meant level, which is what makes the two walls of a house the same height. A run
 * of values is one line only while it stays within the tolerance of its first, so near values do not chain together
 * across the whole shape.
 */
const aligned = (values: readonly number[]): number[] => {
  const reach = ALIGNED * (Math.max(...values) - Math.min(...values));
  const order = values.map((_, index) => index).sort((left, right) => values[left] - values[right]);
  const result = [...values];
  for (let start = 0; start < order.length;) {
    let end = start;
    while (end + 1 < order.length && values[order[end + 1]] - values[order[start]] <= reach) {
      end++;
    }
    const line = order.slice(start, end + 1);
    const middle = mean(line.map((index) => values[index]));
    line.forEach((index) => (result[index] = middle));
    start = end + 1;
  }
  return result;
};

/** How a stroke read as segments is squared up: the smallest side worth reading, and the grid its points land on. */
export type ReadStrokeOptions = {
  /** The smallest stroke worth reading, across its bounds. */
  minimum?: number;
  /** The grid's minor and major cells; with neither, the points are left where they were drawn. */
  minor?: number;
  major?: number;
};

/** `segment` with its ends at `from` and `to`: a bow keeps its depth as a share of the run, and its peak centred. */
const moved = (segment: Segment, from: Point, to: Point, minor: number | undefined): Segment => {
  if (!segment.control) {
    return { from, to };
  }
  const span = (start: Point, end: Point) => {
    const [dx, dy] = [end.x - start.x, end.y - start.y];
    const length = Math.hypot(dx, dy);
    return {
      length,
      along: { x: dx / length, y: dy / length },
      middle: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    };
  };
  const drawn = span(segment.from, segment.to);
  const placed = span(from, to);
  if (drawn.length === 0 || placed.length === 0) {
    // No run to measure the bow against: it moves with the end it leaves.
    return {
      from,
      to,
      control: { x: segment.control.x + from.x - segment.from.x, y: segment.control.y + from.y - segment.from.y },
    };
  }
  const [offX, offY] = [segment.control.x - drawn.middle.x, segment.control.y - drawn.middle.y];
  const across = { x: -drawn.along.y, y: drawn.along.x };
  const slide = (offX * drawn.along.x + offY * drawn.along.y) / drawn.length;
  const depth = ((offX * across.x + offY * across.y) / drawn.length) * placed.length;
  const centred = Math.abs(slide) <= CENTERED;
  // A centred bow's depth is on the grid, so two bows drawn alike are alike; one drawn off-centre keeps its lean.
  const deep =
    centred && minor !== undefined
      ? Math.sign(depth) * Math.max(minor, Math.round(Math.abs(depth) / minor) * minor)
      : depth;
  const turned = { x: -placed.along.y, y: placed.along.x };
  const run = centred ? 0 : slide * placed.length;
  return {
    from,
    to,
    control: {
      x: placed.middle.x + run * placed.along.x + deep * turned.x,
      y: placed.middle.y + run * placed.along.y + deep * turned.y,
    },
  };
};

/**
 * A stroke through `points`, sampled at `times`, as what it draws: a shape of the canvas where it is one, else the
 * segments it runs in, each straight or a parabola, with their ends on the grid; or nothing, where it is too small,
 * too short, or too much of a scribble to be either. Drawn in one go it is read against every shape; drawn with
 * pauses, the segments between them say which shapes it may be, so a box with a bowed side is not a rectangle.
 */
export const readStroke = (
  points: readonly Point[],
  times: readonly number[] = [],
  { minimum = 0, minor, major }: ReadStrokeOptions = {},
): StrokeReading | undefined => {
  if (points.length < MIN_POINTS) {
    return undefined;
  }
  const bounds = boundsOf(points);
  const diagonal = Math.hypot(bounds.width, bounds.height);
  if (diagonal === 0 || diagonal < minimum) {
    return undefined;
  }
  const closed = distance(points[0], points[points.length - 1]) <= CLOSURE * diagonal;
  const pauses = strokePauses(points, times);
  if (closed && pauses.length === 0) {
    const shape = recognizeShape(points, minimum);
    if (shape) {
      return { kind: 'shape', shape };
    }
  }
  // A closed stroke starts again from its first corner, so where the hand began is not taken for one.
  const [first] = pauses;
  const turned = closed && first !== undefined;
  const samples = turned ? [...points.slice(first), ...points.slice(0, first + 1)] : [...points];
  // Where the hand began is then mid-stroke, and a corner like any other unless the line runs on through it; the
  // gap it left short of there is the end of the run before.
  const breaks = turned
    ? [0, ...pauses.slice(1).map((index) => index - first), points.length - first, samples.length - 1]
    : [0, ...pauses, samples.length - 1];
  // A pause where the line runs straight on is a hesitation, not a corner.
  for (let index = 1; index < breaks.length - 1;) {
    const runsOn =
      turnAt(samples, breaks[index]) < STRAIGHT_TURN && fitOne(samples, breaks[index - 1], breaks[index + 1]).fits;
    runsOn ? breaks.splice(index, 1) : index++;
  }
  const segments = breaks.slice(1).flatMap((to, index) => fitRun(samples, breaks[index], to));
  if (closed) {
    segments[segments.length - 1] = { ...segments[segments.length - 1], to: segments[0].from };
    // Begun mid-side, the stroke's two ends are one straight side.
    const [head, tail] = [segments[0], segments[segments.length - 1]];
    if (
      segments.length > 2 &&
      !head.control &&
      !tail.control &&
      turnBetween(tail.from, head.from, head.to) < STRAIGHT_TURN
    ) {
      segments.splice(0, 1);
      segments[segments.length - 1] = { from: tail.from, to: head.to };
    }
  }
  if (closed && pauses.length > 0) {
    const straight = segments.filter(({ control }) => !control).length;
    const only: RecognizedShape['shape'][] =
      straight === segments.length
        ? segments.length === 3
          ? ['triangle']
          : segments.length === 4
            ? ['rect', 'diamond']
            : []
        : straight === 0
          ? ['ellipse']
          : [];
    const shape = recognizeShape(points, minimum, only, SEGMENTED_TOLERANCE);
    if (shape) {
      return { kind: 'shape', shape };
    }
  }
  if (segments.length > MAX_SEGMENTS) {
    return undefined;
  }
  // Adding zero makes a line the grid rounds to from below zero plain zero, which a stored `-0` is not.
  const onGrid = (value: number) =>
    (minor === undefined
      ? value
      : major === undefined
        ? Math.round(value / minor) * minor
        : favorMajor(value, minor, major)) + 0;
  // A closed line begins at the corner nearest where the hand did, as it would have had it begun on one.
  const nearest = closed
    ? segments.reduce(
        (least, { from }, index) =>
          distance(from, points[0]) < distance(segments[least].from, points[0]) ? index : least,
        0,
      )
    : 0;
  const ordered = [...segments.slice(nearest), ...segments.slice(0, nearest)];
  const corners = squared(
    [...ordered.map(({ from }) => from), ...(closed ? [] : [ordered[ordered.length - 1].to])],
    ordered.map(({ control }) => control === undefined),
  ).map(({ x, y }) => ({ x: onGrid(x), y: onGrid(y) }));
  const placed = ordered
    .map((segment, index) => moved(segment, corners[index], corners[(index + 1) % corners.length], minor))
    // A straight segment the grid shut to a point is no segment.
    .filter(({ from, to, control }) => control !== undefined || from.x !== to.x || from.y !== to.y);
  if (placed.length === 0 || (closed && placed.length < 2)) {
    return undefined;
  }
  const bends = placed.flatMap(({ control }, segment) => (control ? [{ segment, control }] : []));
  // Two segments close into a shape only where one bows away from the other.
  const shut = closed && (placed.length > 2 || bends.length > 0);
  return {
    kind: 'path',
    path: {
      points: [...placed.map(({ from }) => from), ...(shut ? [] : [placed[placed.length - 1].to])],
      bends,
      closed: shut,
    },
  };
};
