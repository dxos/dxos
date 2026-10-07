//
// Copyright 2026 DXOS.org
//

//
// Layout diagnostics: a pure analysis of an emitted scene, independent of the dialect and the
// placement strategy that produced it. Everything measured here is geometry already present in
// the scene, so one report covers every dialect, every placement engine, a hand-authored scene,
// and a scene read back from a renderer after the user dragged it. See `docs/DESIGN.md`.
//

import * as Schema from 'effect/Schema';

import * as Layout from './layout.ts';
import * as Scene from './scene.ts';

export const Severity = Schema.Literals(['error', 'warning']);
export type Severity = Schema.Schema.Type<typeof Severity>;

/**
 * `error` codes are objective defects — the picture is wrong, not merely busy — and gate CI.
 * `warning` codes are quality metrics that trend rather than pass/fail; they are golden-filed so
 * a layout change reads as a reviewable diff instead of a threshold argument.
 */
export const Code = Schema.Literals([
  'node-overlap',
  'route-through-node',
  'label-overflow',
  'edge-crossing',
  'excessive-bends',
  'text-overlap',
  'edge-overlap',
]);
export type Code = Schema.Schema.Type<typeof Code>;

export const SEVERITY: Record<Code, Severity> = {
  'node-overlap': 'error',
  'route-through-node': 'error',
  'label-overflow': 'error',
  'edge-crossing': 'warning',
  'excessive-bends': 'warning',
  'text-overlap': 'warning',
  'edge-overlap': 'warning',
};

/** A schema so operations can return diagnostics to the agent — the repair loop. */
export const Diagnostic = Schema.Struct({
  code: Code,
  severity: Severity,
  message: Schema.String,
  refs: Schema.Array(Schema.String).annotate({
    description: 'Scene refs implicated: `objectId` or `objectId/elementId`, as `Arrow.from`/`to` spell them.',
  }),
});
export type Diagnostic = Schema.Schema.Type<typeof Diagnostic>;

/** Aggregate counts; the soft ones are the score a layout change is reviewed against. */
export type Metrics = {
  nodes: number;
  /** Connectors as a reader traces them, source to target: a bus counts once per spoke. */
  connectors: number;
  overlaps: number;
  routesThroughNodes: number;
  labelOverflows: number;
  /** Free text (edge and frame labels) overlapping another label or a box it does not belong to. */
  textOverlaps: number;
  /** Connector pairs that run along the same line for part of their length, so a reader cannot tell them apart. */
  edgeOverlaps: number;
  crossings: number;
  bends: number;
  /** Total connector length in scene units; long edges are hard to follow. */
  length: number;
  width: number;
  height: number;
  /** Boxes that enclose another object's box (subgraph / group frames). */
  containers: number;
  /** Smallest gap from a container to its nearest container (Infinity with fewer than two). */
  frameGapMin: number;
  /** Spread (max − min) of each container's nearest-neighbour gap; 0 when gutters are uniform. */
  frameGapSpread: number;
};

export type Report = {
  diagnostics: readonly Diagnostic[];
  metrics: Metrics;
};

export type Options = {
  /** Bends per connector above which `excessive-bends` is reported (default 3). */
  maxBends?: number;
};

type Point = Scene.Point;
type Rect = { x: number; y: number; w: number; h: number };
type Segment = [Point, Point];

/** Tolerance in scene units; ports land on a half-grid, so this only absorbs float error. */
const EPSILON = 0.5;

const place = (object: Scene.WorldObject, point: Point): Point => {
  const { x = 0, y = 0 } = object.origin ?? {};
  const scale = object.scale ?? 1;
  return { x: x + point.x * scale, y: y + point.y * scale };
};

const isBox = (element: Scene.Element): element is Scene.Box =>
  element.kind === 'rect' || element.kind === 'ellipse' || element.kind === 'diamond' || element.kind === 'triangle';

type Node = { ref: string; rect: Rect; text?: string; weight: Scene.Weight };

/** Absolute rects for every closed shape, keyed by scene ref. */
const nodes = (objects: readonly Scene.WorldObject[]): Node[] =>
  objects.flatMap((object) =>
    object.elements.filter(isBox).map((element) => {
      const origin = place(object, { x: element.x, y: element.y });
      const scale = object.scale ?? 1;
      return {
        ref: `${object.id}/${element.id}`,
        rect: { x: origin.x, y: origin.y, w: element.w * scale, h: element.h * scale },
        text: element.text,
        weight: element.weight ?? 'm',
      };
    }),
  );

/** Length two axis-aligned segments share when they lie on the same line; 0 when they only cross or touch. */
const sharedRun = ([a, b]: Segment, [c, d]: Segment): number => {
  const overlap = (lo1: number, hi1: number, lo2: number, hi2: number) =>
    Math.max(0, Math.min(Math.max(lo1, hi1), Math.max(lo2, hi2)) - Math.max(Math.min(lo1, hi1), Math.min(lo2, hi2)));
  const horizontal = (p: Point, q: Point) => Math.abs(p.y - q.y) < EPSILON;
  const vertical = (p: Point, q: Point) => Math.abs(p.x - q.x) < EPSILON;
  if (horizontal(a, b) && horizontal(c, d) && Math.abs(a.y - c.y) < EPSILON) {
    return overlap(a.x, b.x, c.x, d.x);
  }
  if (vertical(a, b) && vertical(c, d) && Math.abs(a.x - c.x) < EPSILON) {
    return overlap(a.y, b.y, c.y, d.y);
  }
  return 0;
};

export type Label = { ref: string; rect: Rect };

/**
 * Absolute extents of free text elements, estimated from the font metrics as the renderers draw it:
 * `x, y` is the top-left, one line per `\n`.
 */
export const labels = (objects: readonly Scene.WorldObject[]): Label[] =>
  objects.flatMap((object) =>
    object.elements.flatMap((element) => {
      if (element.kind !== 'text') {
        return [];
      }
      const font = Layout.FONT_METRICS[element.weight ?? 's'];
      const scale = object.scale ?? 1;
      const lines = element.text.split('\n');
      const origin = place(object, { x: element.x, y: element.y });
      return [
        {
          ref: `${object.id}/${element.id}`,
          rect: {
            x: origin.x,
            y: origin.y,
            w: Math.max(...lines.map((line) => line.length)) * font.charW * scale,
            h: lines.length * font.lineH * scale,
          },
        },
      ];
    }),
  );

/** Absolute rects of every shape an arrow can bind to, keyed `objectId/elementId` as `Scene.resolveRef` spells them. */
export const bindTargets = (objects: readonly Scene.WorldObject[]): Map<string, Rect> => {
  const targets = new Map<string, Rect>();
  for (const object of objects) {
    const scale = object.scale ?? 1;
    for (const element of object.elements) {
      if (isBox(element) || element.kind === 'portal') {
        const origin = place(object, { x: element.x, y: element.y });
        targets.set(`${object.id}/${element.id}`, {
          x: origin.x,
          y: origin.y,
          w: element.w * scale,
          h: element.h * scale,
        });
      }
    }
  }
  return targets;
};

const centerOf = ({ x, y, w, h }: Rect): Point => ({ x: x + w / 2, y: y + h / 2 });

/** Point where the segment from a rect's centre toward `target` crosses its border. */
const clipToBorder = (rect: Rect, target: Point): Point => {
  const source = centerOf(rect);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  let along = 1;
  if (dx !== 0) {
    along = Math.min(along, ((dx > 0 ? rect.x + rect.w : rect.x) - source.x) / dx);
  }
  if (dy !== 0) {
    along = Math.min(along, ((dy > 0 ? rect.y + rect.h : rect.y) - source.y) / dy);
  }
  return { x: source.x + dx * along, y: source.y + dy * along };
};

/** How far a self-loop stands off its shape. */
const LOOP = 24;

/**
 * The polyline drawn for an arrow, in absolute coordinates: a bound end sits where the line between the
 * two centres leaves its shape, and an arrow bound to one shape at both ends loops off its top-right
 * corner. Undefined when an end resolves to nothing. Renderers draw through this so the picture and the
 * measurement cannot disagree.
 */
export const arrowPoints = (
  object: Scene.WorldObject,
  arrow: Scene.Arrow,
  targets: ReadonlyMap<string, Rect>,
): Point[] | undefined => {
  const resolve = (ref?: string) => (ref === undefined ? undefined : targets.get(Scene.resolveRef(ref, object.id)));
  const [from, to] = [resolve(arrow.from), resolve(arrow.to)];
  if (from && from === to) {
    const [right, top] = [from.x + from.w, from.y];
    return [
      { x: from.x + from.w * 0.75, y: top },
      { x: from.x + from.w * 0.75, y: top - LOOP },
      { x: right + LOOP, y: top - LOOP },
      { x: right + LOOP, y: top + from.h * 0.25 },
      { x: right, y: top + from.h * 0.25 },
    ];
  }
  const explicitStart = arrow.start && place(object, arrow.start);
  const explicitEnd = arrow.end && place(object, arrow.end);
  const start = from
    ? clipToBorder(from, to ? centerOf(to) : (explicitEnd ?? place(object, { x: 0, y: 0 })))
    : explicitStart;
  const end = to
    ? clipToBorder(to, from ? centerOf(from) : (explicitStart ?? place(object, { x: 0, y: 0 })))
    : explicitEnd;
  return start && end ? [start, end] : undefined;
};

/** A drawn connector piece; `headed` when it ends in an arrow element rather than a bare line. */
type Connector = { ref: string; points: Point[]; headed: boolean };

/**
 * Connector paths, rejoining the `line` prefix and `arrow` head the emitters split a routed edge
 * into (`<id>-path` + `<id>`); a plain arrow is a one-segment path, a bound one drawn as `arrowPoints`.
 */
const connectors = (objects: readonly Scene.WorldObject[], targets: ReadonlyMap<string, Rect>): Connector[] => {
  const paths = new Map<string, Connector>();
  for (const object of objects) {
    for (const element of object.elements) {
      if (element.kind === 'line') {
        const id = element.id.replace(/-path$/, '');
        const ref = `${object.id}/${id}`;
        paths.set(ref, { ref, points: element.points.map((point) => place(object, point)), headed: false });
      }
    }
    for (const element of object.elements) {
      const head = element.kind === 'arrow' ? arrowPoints(object, element, targets) : undefined;
      if (head) {
        const ref = `${object.id}/${element.id}`;
        const existing = paths.get(ref);
        // The head's start repeats the polyline's last waypoint; keep one copy.
        paths.set(ref, { ref, points: existing ? [...existing.points.slice(0, -1), ...head] : head, headed: true });
      }
    }
  }
  // An empty path has no ends to bus or trace, and every reader of a connector assumes it has some.
  return [...paths.values()].filter(({ points }) => points.length > 0);
};

const segmentsOf = ({ points }: { points: readonly Point[] }): Segment[] =>
  points.slice(0, -1).map((point, index): Segment => [point, points[index + 1]]);

const orientation = (origin: Point, a: Point, b: Point) =>
  (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);

const coincident = (a: Point, b: Point) => Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;

/**
 * Proper crossing: each segment has the other's ends strictly on opposite sides, so a shared port or a
 * T where one connector ends on another is not a crossing.
 */
const properlyCrosses = ([a1, a2]: Segment, [b1, b2]: Segment): boolean => {
  if ([a1, a2].some((a) => [b1, b2].some((b) => coincident(a, b)))) {
    return false;
  }
  return orientation(a1, a2, b1) * orientation(a1, a2, b2) < 0 && orientation(b1, b2, a1) * orientation(b1, b2, a2) < 0;
};

/** Whether a point lies on a segment, within `EPSILON`. */
const onSegment = (point: Point, [start, end]: Segment): boolean => {
  const [dx, dy] = [end.x - start.x, end.y - start.y];
  const lengthSquared = dx * dx + dy * dy;
  const along =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - start.x - along * dx, point.y - start.y - along * dy) < EPSILON;
};

const onPath = (point: Point, connector: Connector) =>
  segmentsOf(connector).some((segment) => onSegment(point, segment));

/** Whether a point lies on a rect's outline: where a connector meets a node at a port. */
const onBorder = (point: Point, rect: Rect): boolean =>
  point.x > rect.x - EPSILON &&
  point.x < rect.x + rect.w + EPSILON &&
  point.y > rect.y - EPSILON &&
  point.y < rect.y + rect.h + EPSILON &&
  !(
    point.x > rect.x + EPSILON &&
    point.x < rect.x + rect.w - EPSILON &&
    point.y > rect.y + EPSILON &&
    point.y < rect.y + rect.h - EPSILON
  );

/** Drops repeated points and the midpoints of straight runs. */
const simplify = (points: readonly Point[]): Point[] =>
  points
    .filter((point, index) => index === 0 || !coincident(point, points[index - 1]))
    .filter((point, index, kept) => {
      if (index === 0 || index === kept.length - 1) {
        return true;
      }
      const [previous, next] = [kept[index - 1], kept[index + 1]];
      return (
        Math.abs(orientation(previous, point, next)) >= EPSILON * Math.hypot(next.x - previous.x, next.y - previous.y)
      );
    });

/**
 * Connector pieces joined at a junction in free space — a bus trunk and its spokes — as one connector: a
 * piece ending on another away from any node's border, without running along it, belongs to it.
 */
const busesOf = (pieces: readonly Connector[], rects: readonly Rect[]): Connector[][] => {
  const parent = pieces.map((_, index) => index);
  const root = (index: number): number => (parent[index] === index ? index : (parent[index] = root(parent[index])));
  const free = (point: Point) => !rects.some((rect) => onBorder(point, rect));
  pieces.forEach((piece, index) => {
    for (const end of [piece.points[0], piece.points[piece.points.length - 1]]) {
      if (!free(end)) {
        continue;
      }
      pieces.forEach((other, otherIndex) => {
        const alongside = segmentsOf(piece).some((a) => segmentsOf(other).some((b) => sharedRun(a, b) > EPSILON));
        if (otherIndex !== index && onPath(end, other) && !alongside) {
          parent[root(index)] = root(otherIndex);
        }
      });
    }
  });
  const groups = new Map<number, Connector[]>();
  pieces.forEach((piece, index) => groups.set(root(index), [...(groups.get(root(index)) ?? []), piece]));
  return [...groups.values()];
};

/** Shortest walk between two points along a bus's pieces. */
const walk = (pieces: readonly Connector[], from: Point, to: Point): Point[] | undefined => {
  const vertices: Point[] = [];
  const indexOf = (point: Point) => {
    const found = vertices.findIndex((vertex) => coincident(vertex, point));
    return found >= 0 ? found : vertices.push(point) - 1;
  };
  pieces.forEach(({ points }) => points.forEach(indexOf));
  const links = vertices.map((): { to: number; length: number }[] => []);
  for (const segment of pieces.flatMap(segmentsOf)) {
    const [start] = segment;
    const stops = vertices
      .map((vertex, index) => ({ index, distance: Math.hypot(vertex.x - start.x, vertex.y - start.y) }))
      .filter(({ index }) => onSegment(vertices[index], segment))
      .sort((left, right) => left.distance - right.distance);
    stops.slice(1).forEach((stop, index) => {
      const length = stop.distance - stops[index].distance;
      links[stop.index].push({ to: stops[index].index, length });
      links[stops[index].index].push({ to: stop.index, length });
    });
  }
  const [source, target] = [indexOf(from), indexOf(to)];
  const distance = vertices.map((_, index) => (index === source ? 0 : Infinity));
  const previous = vertices.map((): number | undefined => undefined);
  const open = new Set(vertices.map((_, index) => index));
  while (open.size > 0) {
    const current = [...open].reduce((best, index) => (distance[index] < distance[best] ? index : best));
    open.delete(current);
    if (current === target || distance[current] === Infinity) {
      break;
    }
    for (const link of links[current]) {
      if (distance[current] + link.length < distance[link.to]) {
        distance[link.to] = distance[current] + link.length;
        previous[link.to] = current;
      }
    }
  }
  if (distance[target] === Infinity) {
    return undefined;
  }
  const path = [target];
  for (let step = previous[target]; step !== undefined; step = previous[step]) {
    path.unshift(step);
  }
  return path.map((index) => vertices[index]);
};

/** A connector as a reader traces it, from one shape to another; `ref` names the piece at its far end. */
export type Route = {
  ref: string;
  points: Point[];
  /** Turns a reader follows; a turn where pieces of a bus meet is the bus's shape, not a bend. */
  bends: number;
};

/**
 * The routes of one connector. A bus with a single arrowhead (spokes gathering into a headed trunk) or a
 * single bare end (a trunk fanning out to headed spokes) runs hub to spoke; anything else is its pieces.
 */
const routesOf = (bus: readonly Connector[]): Route[] => {
  if (bus.length === 1) {
    const points = simplify(bus[0].points);
    return [{ ref: bus[0].ref, points, bends: bendCount({ points }) }];
  }
  const ends = bus.flatMap((piece) => [
    { piece, point: piece.points[0], headed: false },
    { piece, point: piece.points[piece.points.length - 1], headed: piece.headed },
  ]);
  const meets = (end: (typeof ends)[number]) => bus.some((other) => other !== end.piece && onPath(end.point, other));
  const junctions = ends.filter(meets).map(({ point }) => point);
  const traced = (ref: string, points: Point[]): Route => {
    const corners = simplify(points);
    const atJunction = corners
      .slice(1, -1)
      .filter((corner, index) => bendCount({ points: corners.slice(index, index + 3) }) > 0)
      .filter((corner) => junctions.some((junction) => coincident(junction, corner))).length;
    return { ref, points: corners, bends: bendCount({ points: corners }) - atJunction };
  };
  const terminals = ends.filter((end) => !meets(end));
  const heads = terminals.filter(({ headed }) => headed);
  const tails = terminals.filter(({ headed }) => !headed);
  const [hub, leaves, inward] =
    heads.length === 1
      ? [heads[0], tails, true]
      : tails.length === 1
        ? [tails[0], heads, false]
        : [undefined, [], false];
  if (!hub) {
    return bus.map(({ ref, points }) => traced(ref, points));
  }
  return leaves.map((leaf) => {
    const points = inward ? walk(bus, leaf.point, hub.point) : walk(bus, hub.point, leaf.point);
    return traced(leaf.piece.ref, points ?? leaf.piece.points);
  });
};

/** Every connector's routes, as a reader traces them; a bus contributes one per spoke. */
export const routes = (objects: readonly Scene.WorldObject[]): Route[] => {
  const targets = bindTargets(objects);
  return busesOf(
    connectors(objects, targets),
    nodes(objects).map(({ rect }) => rect),
  ).flatMap(routesOf);
};

/** Overlap area of two rects; 0 when they merely touch. */
const overlapArea = (a: Rect, b: Rect): number => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > EPSILON && h > EPSILON ? w * h : 0;
};

/**
 * Strict enclosure: the inner rect fits inside AND is smaller. Two identical rects are stacked
 * nodes — the strongest overlap — not a container and its member.
 */
const contains = (outer: Rect, inner: Rect): boolean =>
  outer.x - EPSILON <= inner.x &&
  outer.y - EPSILON <= inner.y &&
  outer.x + outer.w + EPSILON >= inner.x + inner.w &&
  outer.y + outer.h + EPSILON >= inner.y + inner.h &&
  (inner.w < outer.w - EPSILON || inner.h < outer.h - EPSILON);

/**
 * Length of the segment's run through the rect's INTERIOR (Liang-Barsky). A connector legitimately
 * terminating at a node only touches its border, so an interior run identifies a route drawn
 * across a node it does not belong to — no knowledge of the edge's terminals required.
 */
const interiorRun = ([start, end]: Segment, rect: Rect): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // Inset so a route running flush along a border, or into a port, is not counted.
  const box = { x: rect.x + EPSILON, y: rect.y + EPSILON, w: rect.w - EPSILON * 2, h: rect.h - EPSILON * 2 };
  if (box.w <= 0 || box.h <= 0) {
    return 0;
  }
  let enter = 0;
  let exit = 1;
  for (const [p, q] of [
    [-dx, start.x - box.x],
    [dx, box.x + box.w - start.x],
    [-dy, start.y - box.y],
    [dy, box.y + box.h - start.y],
  ]) {
    if (p === 0) {
      if (q < 0) {
        return 0;
      }
      continue;
    }
    const r = q / p;
    if (p < 0) {
      enter = Math.max(enter, r);
    } else {
      exit = Math.min(exit, r);
    }
  }
  return enter >= exit ? 0 : Math.hypot(dx, dy) * (exit - enter);
};

/** Bends in an orthogonal path: waypoints where the run changes axis. */
const bendCount = ({ points }: { points: readonly Point[] }): number => {
  let bends = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const [previous, point, next] = [points[index - 1], points[index], points[index + 1]];
    const collinear =
      (Math.abs(previous.x - point.x) < EPSILON && Math.abs(point.x - next.x) < EPSILON) ||
      (Math.abs(previous.y - point.y) < EPSILON && Math.abs(point.y - next.y) < EPSILON);
    if (!collinear) {
      bends++;
    }
  }
  return bends;
};

/** Box label type as the SVG renderer sets it, per weight: font size and line advance in scene units. */
export const LABEL_TYPE: Record<Scene.Weight, { size: number; lineH: number }> = {
  s: { size: 13, lineH: 20 },
  m: { size: 18, lineH: 26 },
  l: { size: 27, lineH: 38 },
  xl: { size: 34, lineH: 48 },
};

/** Average glyph advance over font size for a UI sans, for wrap estimates. */
export const CHAR_EM = 0.6;

/** Room kept between a box label and the box's sides, and its top and bottom. */
export const LABEL_INSET = { x: 12, y: 4 };

/** Font scales a label tries, largest first, before it is ellipsized at the last. */
const LABEL_SCALES = [1, 0.9, 0.8];

/** Breaks inside a word too long for a line: before a capital that follows a lower-case letter or digit, after punctuation. */
const WORD_BREAK = /(?<=[a-z0-9])(?=[A-Z])|(?<=[-_/.:])/;

/** Greedy wrap at spaces; a word longer than a line breaks at camel case or punctuation, then anywhere. */
const wrapLabel = (text: string, perLine: number): string[] =>
  text.split('\n').flatMap((line) => {
    const tokens = line
      .split(' ')
      .flatMap((word, wordIndex) =>
        (word.length <= perLine ? [word] : word.split(WORD_BREAK))
          .flatMap((part) =>
            part.length <= perLine
              ? [part]
              : Array.from({ length: Math.ceil(part.length / perLine) }, (_, index) =>
                  part.slice(index * perLine, (index + 1) * perLine),
                ),
          )
          .map((part, partIndex) => ({ text: part, glue: wordIndex > 0 && partIndex === 0 ? ' ' : '' })),
      );
    const lines: string[] = [];
    let current = '';
    for (const { text: part, glue } of tokens) {
      const candidate = current ? `${current}${glue}${part}` : part;
      if (candidate.length > perLine && current) {
        lines.push(current);
        current = part;
      } else {
        current = candidate;
      }
    }
    return [...lines, current];
  });

export type LabelLayout = {
  lines: string[];
  size: number;
  lineH: number;
  /** The label does not show whole: it was ellipsized, or even one line is taller than the box. */
  overflow: boolean;
};

/**
 * How the SVG renderer sets a box label: wrapped to the box width, shrunk a little if it still does not
 * fit the height, and ellipsized at the smallest size, so text never spills out of its box.
 */
export const layoutLabel = (text: string, weight: Scene.Weight, { w, h }: { w: number; h: number }): LabelLayout => {
  const room = { w: Math.max(0, w - LABEL_INSET.x * 2), h: Math.max(0, h - LABEL_INSET.y * 2) };
  const attempts = LABEL_SCALES.map((scale) => {
    const [size, lineH] = [LABEL_TYPE[weight].size * scale, LABEL_TYPE[weight].lineH * scale];
    const perLine = Math.max(1, Math.floor(room.w / (size * CHAR_EM)));
    const maxLines = Math.max(1, Math.floor((room.h - size) / lineH) + 1);
    return { size, lineH, perLine, maxLines, lines: wrapLabel(text, perLine) };
  });
  const fitting = attempts.find(({ size, lines, maxLines }) => lines.length <= maxLines && size <= room.h + EPSILON);
  if (fitting) {
    return { lines: fitting.lines, size: fitting.size, lineH: fitting.lineH, overflow: false };
  }
  const { size, lineH, perLine, maxLines, lines } = attempts[attempts.length - 1];
  if (lines.length <= maxLines) {
    return { lines, size, lineH, overflow: true };
  }
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(0, perLine - 1)).trimEnd()}…`;
  return { lines: kept, size, lineH, overflow: true };
};

const labelFits = ({ rect, text, weight }: Node): boolean => !text || !layoutLabel(text, weight, rect).overflow;

/**
 * Analyzes an emitted scene for layout defects and quality metrics. Pure: the same scene always
 * yields the same report, so the soft metrics can be golden-filed and the hard codes asserted.
 */
export const analyze = (objects: readonly Scene.WorldObject[], { maxBends = 3 }: Options = {}): Report => {
  const diagnostics: Diagnostic[] = [];
  const allNodes = nodes(objects);
  const allConnectors = connectors(objects, bindTargets(objects));
  const buses = busesOf(
    allConnectors,
    allNodes.map(({ rect }) => rect),
  );
  const allRoutes = buses.flatMap(routesOf);
  const ownerOf = (ref: string) => ref.slice(0, ref.indexOf('/'));

  // A box enclosing another object's box is a container (subgraph or group frame): connectors
  // cross its border by design, so it is never an obstacle.
  const containers = new Set(
    allNodes
      .filter((outer) =>
        allNodes.some((inner) => ownerOf(inner.ref) !== ownerOf(outer.ref) && contains(outer.rect, inner.rect)),
      )
      .map(({ ref }) => ref),
  );

  // Overlap is compared across objects only: an object's own shapes are composed deliberately
  // (a UML frame behind its title bar), and a container legitimately encloses its members.
  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const [left, right] = [allNodes[i], allNodes[j]];
      if (ownerOf(left.ref) === ownerOf(right.ref)) {
        continue;
      }
      if (contains(left.rect, right.rect) || contains(right.rect, left.rect)) {
        continue;
      }
      if (overlapArea(left.rect, right.rect) > 0) {
        diagnostics.push({
          code: 'node-overlap',
          severity: SEVERITY['node-overlap'],
          message: `Nodes "${left.ref}" and "${right.ref}" overlap.`,
          refs: [left.ref, right.ref],
        });
      }
    }
  }

  for (const connector of allConnectors) {
    for (const node of allNodes) {
      // Shapes in the connector's own object are its decoration, not obstacles.
      if (ownerOf(node.ref) === ownerOf(connector.ref) || containers.has(node.ref)) {
        continue;
      }
      const run = segmentsOf(connector).reduce((total, segment) => total + interiorRun(segment, node.rect), 0);
      if (run > EPSILON) {
        diagnostics.push({
          code: 'route-through-node',
          severity: SEVERITY['route-through-node'],
          message: `Connector "${connector.ref}" is drawn across node "${node.ref}".`,
          refs: [connector.ref, node.ref],
        });
      }
    }
  }

  for (const node of allNodes) {
    if (!labelFits(node)) {
      diagnostics.push({
        code: 'label-overflow',
        severity: SEVERITY['label-overflow'],
        message: `Label of "${node.ref}" does not fit its shape.`,
        refs: [node.ref],
      });
    }
  }

  // Pieces of one bus meet by design, so crossings and shared runs are counted between buses.
  const firstPair = (
    left: readonly Connector[],
    right: readonly Connector[],
    test: (a: Segment, b: Segment) => boolean,
  ) =>
    left
      .flatMap((a) => right.map((b) => [a, b] as const))
      .find(([a, b]) => segmentsOf(a).some((first) => segmentsOf(b).some((second) => test(first, second))));

  let crossings = 0;
  for (let i = 0; i < buses.length; i++) {
    for (let j = i + 1; j < buses.length; j++) {
      const crossed = firstPair(buses[i], buses[j], properlyCrosses);
      if (crossed) {
        const [left, right] = crossed;
        crossings++;
        diagnostics.push({
          code: 'edge-crossing',
          severity: SEVERITY['edge-crossing'],
          message: `Connectors "${left.ref}" and "${right.ref}" cross.`,
          refs: [left.ref, right.ref],
        });
      }
    }
  }

  let edgeOverlaps = 0;
  for (let i = 0; i < buses.length; i++) {
    for (let j = i + 1; j < buses.length; j++) {
      const pairs = buses[i].flatMap((left) => buses[j].map((right) => [left, right] as const));
      const runs = pairs.map(([left, right]) =>
        segmentsOf(left).reduce(
          (total, a) => total + segmentsOf(right).reduce((sum, b) => sum + sharedRun(a, b), 0),
          0,
        ),
      );
      const run = runs.reduce((total, value) => total + value, 0);
      if (run > EPSILON) {
        const [left, right] = pairs[runs.findIndex((value) => value > 0)];
        edgeOverlaps++;
        diagnostics.push({
          code: 'edge-overlap',
          severity: SEVERITY['edge-overlap'],
          message: `Connectors "${left.ref}" and "${right.ref}" run along the same line for ${Math.round(run)} units.`,
          refs: [left.ref, right.ref],
        });
      }
    }
  }

  // Text is compared with other text and with boxes outside its own object; a frame's label sits in
  // the frame's band by design, and a container is a backdrop, not an obstacle.
  const allLabels = labels(objects);
  let textOverlaps = 0;
  const overlapText = (ref: string, other: string) => {
    textOverlaps++;
    diagnostics.push({
      code: 'text-overlap',
      severity: SEVERITY['text-overlap'],
      message: `Label "${ref}" overlaps "${other}".`,
      refs: [ref, other],
    });
  };
  for (let i = 0; i < allLabels.length; i++) {
    for (let j = i + 1; j < allLabels.length; j++) {
      if (overlapArea(allLabels[i].rect, allLabels[j].rect) > EPSILON) {
        overlapText(allLabels[i].ref, allLabels[j].ref);
      }
    }
    for (const node of allNodes) {
      if (ownerOf(node.ref) !== ownerOf(allLabels[i].ref) && !containers.has(node.ref)) {
        if (overlapArea(allLabels[i].rect, node.rect) > EPSILON) {
          overlapText(allLabels[i].ref, node.ref);
        }
      }
    }
  }

  // Each drawn corner counts once; the bend limit applies to a route as a reader follows it, trunk and spoke together.
  let bends = 0;
  let length = 0;
  for (const connector of allConnectors) {
    length += segmentsOf(connector).reduce((total, [a, b]) => total + Math.hypot(b.x - a.x, b.y - a.y), 0);
    bends += bendCount(connector);
  }
  for (const route of allRoutes) {
    const count = route.bends;
    if (count > maxBends) {
      diagnostics.push({
        code: 'excessive-bends',
        severity: SEVERITY['excessive-bends'],
        message: `Connector "${route.ref}" takes ${count} bends.`,
        refs: [route.ref],
      });
    }
  }

  const xs = allNodes.flatMap(({ rect }) => [rect.x, rect.x + rect.w]);
  const ys = allNodes.flatMap(({ rect }) => [rect.y, rect.y + rect.h]);

  // Gutter uniformity between containers: each frame's gap to its nearest frame. Nearest-neighbour
  // (rather than all pairs) so a row of three is judged on its two gutters, not the span across.
  const frameRects = allNodes.filter(({ ref }) => containers.has(ref)).map(({ rect }) => rect);
  const gapBetween = (a: Rect, b: Rect) =>
    Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), a.y - (b.y + b.h), b.y - (a.y + a.h));
  const nearestGaps = frameRects.flatMap((frame, index) => {
    const gaps = frameRects
      .filter((_, other) => other !== index)
      .map((other) => gapBetween(frame, other))
      .filter((gap) => gap >= 0);
    return gaps.length ? [Math.min(...gaps)] : [];
  });

  return {
    diagnostics,
    metrics: {
      nodes: allNodes.length,
      connectors: allRoutes.length,
      overlaps: diagnostics.filter(({ code }) => code === 'node-overlap').length,
      routesThroughNodes: diagnostics.filter(({ code }) => code === 'route-through-node').length,
      labelOverflows: diagnostics.filter(({ code }) => code === 'label-overflow').length,
      textOverlaps,
      edgeOverlaps,
      crossings,
      bends,
      length,
      width: xs.length ? Math.max(...xs) - Math.min(...xs) : 0,
      height: ys.length ? Math.max(...ys) - Math.min(...ys) : 0,
      containers: frameRects.length,
      frameGapMin: nearestGaps.length ? Math.min(...nearestGaps) : Infinity,
      frameGapSpread: nearestGaps.length >= 2 ? Math.max(...nearestGaps) - Math.min(...nearestGaps) : 0,
    },
  };
};

/** Errors only — the set that gates CI and that an agent must fix before the diagram is usable. */
export const errors = (report: Report): readonly Diagnostic[] =>
  report.diagnostics.filter(({ severity }) => severity === 'error');
