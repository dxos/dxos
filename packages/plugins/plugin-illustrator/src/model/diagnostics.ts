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

import * as Layout from './layout';
import type * as Scene from './scene';

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
]);
export type Code = Schema.Schema.Type<typeof Code>;

export const SEVERITY: Record<Code, Severity> = {
  'node-overlap': 'error',
  'route-through-node': 'error',
  'label-overflow': 'error',
  'edge-crossing': 'warning',
  'excessive-bends': 'warning',
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
  connectors: number;
  overlaps: number;
  routesThroughNodes: number;
  labelOverflows: number;
  crossings: number;
  bends: number;
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

type Connector = { ref: string; points: Point[] };

/**
 * Connector paths, rejoining the `line` prefix and `arrow` head the emitters split a routed edge
 * into (`<id>-path` + `<id>`); a plain arrow is a one-segment path.
 */
const connectors = (objects: readonly Scene.WorldObject[]): Connector[] => {
  const paths = new Map<string, Connector>();
  for (const object of objects) {
    for (const element of object.elements) {
      if (element.kind === 'line') {
        const id = element.id.replace(/-path$/, '');
        const ref = `${object.id}/${id}`;
        paths.set(ref, { ref, points: element.points.map((point) => place(object, point)) });
      }
    }
    for (const element of object.elements) {
      if (element.kind === 'arrow' && element.start && element.end) {
        const ref = `${object.id}/${element.id}`;
        const head = [place(object, element.start), place(object, element.end)];
        const existing = paths.get(ref);
        // The head's start repeats the polyline's last waypoint; keep one copy.
        paths.set(ref, { ref, points: existing ? [...existing.points.slice(0, -1), ...head] : head });
      }
    }
  }
  return [...paths.values()];
};

const segmentsOf = ({ points }: Connector): Segment[] =>
  points.slice(0, -1).map((point, index): Segment => [point, points[index + 1]]);

const orientation = (origin: Point, a: Point, b: Point) =>
  (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);

const coincident = (a: Point, b: Point) => Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;

/** Proper crossing: the segments intersect away from all four endpoints (shared ports do not count). */
const properlyCrosses = ([a1, a2]: Segment, [b1, b2]: Segment): boolean => {
  if ([a1, a2].some((a) => [b1, b2].some((b) => coincident(a, b)))) {
    return false;
  }
  const d1 = orientation(a1, a2, b1);
  const d2 = orientation(a1, a2, b2);
  const d3 = orientation(b1, b2, a1);
  const d4 = orientation(b1, b2, a2);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0;
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
const bendCount = ({ points }: Connector): number => {
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

/**
 * Estimated bounds of a wrapped label, using the shared font metrics the dialects size boxes by.
 * The last line carries no trailing leading: `lineH ≈ 1.35em` (see `FONT_METRICS`), so the glyph
 * block is `(lines − 1) · lineH + em`.
 */
const labelFits = ({ rect, text, weight }: Node): boolean => {
  if (!text) {
    return true;
  }
  const font = Layout.FONT_METRICS[weight];
  const perLine = Math.max(1, Math.floor(rect.w / font.charW));
  const lines = text.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / perLine)), 0);
  return (lines - 1) * font.lineH + font.lineH / 1.35 <= rect.h + EPSILON;
};

/**
 * Analyzes an emitted scene for layout defects and quality metrics. Pure: the same scene always
 * yields the same report, so the soft metrics can be golden-filed and the hard codes asserted.
 */
export const analyze = (objects: readonly Scene.WorldObject[], { maxBends = 3 }: Options = {}): Report => {
  const diagnostics: Diagnostic[] = [];
  const allNodes = nodes(objects);
  const allConnectors = connectors(objects);
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

  let crossings = 0;
  for (let i = 0; i < allConnectors.length; i++) {
    for (let j = i + 1; j < allConnectors.length; j++) {
      const [left, right] = [allConnectors[i], allConnectors[j]];
      const crossed = segmentsOf(left).some((a) => segmentsOf(right).some((b) => properlyCrosses(a, b)));
      if (crossed) {
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

  let bends = 0;
  for (const connector of allConnectors) {
    const count = bendCount(connector);
    bends += count;
    if (count > maxBends) {
      diagnostics.push({
        code: 'excessive-bends',
        severity: SEVERITY['excessive-bends'],
        message: `Connector "${connector.ref}" takes ${count} bends.`,
        refs: [connector.ref],
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
      connectors: allConnectors.length,
      overlaps: diagnostics.filter(({ code }) => code === 'node-overlap').length,
      routesThroughNodes: diagnostics.filter(({ code }) => code === 'route-through-node').length,
      labelOverflows: diagnostics.filter(({ code }) => code === 'label-overflow').length,
      crossings,
      bends,
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
