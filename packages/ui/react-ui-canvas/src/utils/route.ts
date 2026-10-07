//
// Copyright 2026 DXOS.org
//

//
// Link routes as SVG path data in scene coordinates, one per link type: `line` is straight, `curve`
// leaves each port along its side's normal and bends toward the other end, `spline` is the polyline
// through the link's control points with its corners rounded. `ortho` (phase 2) will come from
// `@dxos/diagram`'s router.
//

import { Nudge } from '@dxos/diagram';

import { type NodeRegistry } from '../model/registry.ts';
import {
  DEFAULT_GRID,
  type Endpoint,
  type Link,
  MAJOR_GRID,
  type Node,
  type Point,
  type Port,
  type PortEndpoint,
  type Scene,
  type Side,
  isPointEndpoint,
} from '../model/types.ts';
import { gutterRoute } from './gutter-route.ts';
import { type LatticeSpec } from './lattice.ts';
import { type PortTerminal, nearestPort, nodePorts, pairPorts, portPoint, sideNormal } from './ports.ts';
import { nodeBounds } from './shapes.ts';

const MIN_TANGENT = 40;
const TANGENT_RATIO = 0.4;

/**
 * How far a rounded corner reaches back along each of its segments, in scene px: one minor grid cell, so
 * every corner of a route has the same radius (a gutter route's port stubs are half a gutter, two cells).
 */
const CORNER_RADIUS = DEFAULT_GRID;

/** How far a smart link's stub leaves its port, in scene px (half a major cell). */
const SMART_STUB = MAJOR_GRID / 2;

export type RouteEnd = { point: Point; side: Side };

const pt = ({ x, y }: Point) => `${x} ${y}`;

export const linePath = (from: Point, to: Point): string => `M ${pt(from)} L ${pt(to)}`;

const curveControls = (from: RouteEnd, to: RouteEnd): [Point, Point] => {
  const dx = to.point.x - from.point.x;
  const dy = to.point.y - from.point.y;
  const tangent = Math.max(MIN_TANGENT, Math.hypot(dx, dy) * TANGENT_RATIO);
  const fromNormal = sideNormal(from.side);
  const toNormal = sideNormal(to.side);
  return [
    { x: from.point.x + fromNormal.x * tangent, y: from.point.y + fromNormal.y * tangent },
    { x: to.point.x + toNormal.x * tangent, y: to.point.y + toNormal.y * tangent },
  ];
};

/** Cubic Bézier whose control points sit `tangent` px out along each port's normal. */
export const curvePath = (from: RouteEnd, to: RouteEnd): string => {
  const [control1, control2] = curveControls(from, to);
  return `M ${pt(from.point)} C ${pt(control1)}, ${pt(control2)}, ${pt(to.point)}`;
};

/** Point on the curve at parameter `t`, for placing a label at the midpoint. */
export const curvePoint = (from: RouteEnd, to: RouteEnd, t: number): Point => {
  const [p1, p2] = curveControls(from, to);
  const p0 = from.point;
  const p3 = to.point;
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};

const distance = (from: Point, to: Point): number => Math.hypot(to.x - from.x, to.y - from.y);

/** The point `length` along the way from `from` towards `to`, or `from` when the two coincide. */
const towards = (from: Point, to: Point, length: number): Point => {
  const span = distance(from, to);
  return span === 0
    ? from
    : { x: from.x + ((to.x - from.x) / span) * length, y: from.y + ((to.y - from.y) / span) * length };
};

/**
 * The polyline through every point with its corners rounded: each interior point becomes a quadratic
 * Bézier that takes the point as its control, so the route bends around a control point rather than
 * through it and a corner reads as a corner. The radius shrinks to half the shorter adjoining segment
 * where a point is close to its neighbours, so two corners never eat into each other.
 */
export const splinePath = (points: readonly Point[]): string => {
  if (points.length < 2) {
    return '';
  }
  const last = points.length - 1;
  const segments: string[] = [`M ${pt(points[0])}`];
  for (let index = 1; index < last; index++) {
    const previous = points[index - 1];
    const vertex = points[index];
    const next = points[index + 1];
    const radius = Math.min(CORNER_RADIUS, distance(previous, vertex) / 2, distance(vertex, next) / 2);
    segments.push(`L ${pt(towards(vertex, previous, radius))}`);
    segments.push(`Q ${pt(vertex)}, ${pt(towards(vertex, next, radius))}`);
  }
  segments.push(`L ${pt(points[last])}`);
  return segments.join(' ');
};

/** The path of a link between two resolved ends, by its type; on a lattice a smart link takes the gutters. */
export const linkPath = (link: Link, from: RouteEnd, to: RouteEnd, lattice?: LatticeRoute): string => {
  switch (link.type) {
    case 'line':
      return linePath(from.point, to.point);
    case 'curve':
      return curvePath(from, to);
    case 'spline':
      return splinePath([from.point, ...link.points, to.point]);
    case 'smart':
      return splinePath((lattice && gutterRoute(lattice.nodes, lattice.spec, from, to)) ?? smartPoints(from, to));
  }
};

/** What gutter routing needs: the lattice and the nodes whose frames block it. */
export type LatticeRoute = { spec: LatticeSpec; nodes: readonly Node[] };

/**
 * The polyline a smart link follows: a stub out of each port along its side's normal, then one segment
 * joining them. `splinePath` rounds where they meet, so a pair of facing ports reads as the elbow the
 * ports imply rather than a straight line cutting across their own nodes.
 */
export const smartPoints = (from: RouteEnd, to: RouteEnd): Point[] => {
  const fromNormal = sideNormal(from.side);
  const toNormal = sideNormal(to.side);
  return [
    from.point,
    { x: from.point.x + fromNormal.x * SMART_STUB, y: from.point.y + fromNormal.y * SMART_STUB },
    { x: to.point.x + toNormal.x * SMART_STUB, y: to.point.y + toNormal.y * SMART_STUB },
    to.point,
  ];
};

export type LinkGeometry = { link: Link; path: string; source: RouteEnd; target: RouteEnd };

/** The side of a free end: the one facing the other end, so the route leaves it toward that end. */
export const sideToward = (from: Point, to: Point): Side => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'e' : 'w') : dy >= 0 ? 's' : 'n';
};

/** A node end as the port picker sees it, or nothing when the node is gone. */
const terminalOf = (scene: Scene, registry: NodeRegistry, end: PortEndpoint): PortTerminal | undefined => {
  const node = scene.nodes[end.node];
  return node ? { bounds: nodeBounds(node), ports: nodePorts(registry, node), port: end.port } : undefined;
};

const routeEnd = (terminal: PortTerminal, port: Port): RouteEnd => ({
  point: portPoint(terminal.bounds, port),
  side: port.side,
});

/**
 * Resolve a link's ends and route it by its type: two node ends take the automatic (or pinned) port pair,
 * a node end facing a free point takes the port nearest that point, and two free points face each other.
 */
export const linkGeometry = (
  scene: Scene,
  registry: NodeRegistry,
  link: Link,
  lattice?: LatticeSpec,
): LinkGeometry | undefined => {
  const ends = resolveEnds(scene, registry, link.source, link.target);
  if (!ends) {
    return undefined;
  }
  const [from, to] = ends;
  const route = lattice ? { spec: lattice, nodes: Object.values(scene.nodes) } : undefined;
  return { link, path: linkPath(link, from, to, route), source: from, target: to };
};

const resolveEnds = (
  scene: Scene,
  registry: NodeRegistry,
  source: Endpoint,
  target: Endpoint,
): [RouteEnd, RouteEnd] | undefined => {
  if (isPointEndpoint(source)) {
    if (isPointEndpoint(target)) {
      return [
        { point: source.point, side: sideToward(source.point, target.point) },
        { point: target.point, side: sideToward(target.point, source.point) },
      ];
    }
    const terminal = terminalOf(scene, registry, target);
    const port = terminal && nearestPort(terminal, source.point, 'in');
    if (!terminal || !port) {
      return undefined;
    }
    const to = routeEnd(terminal, port);
    return [{ point: source.point, side: sideToward(source.point, to.point) }, to];
  }
  if (isPointEndpoint(target)) {
    const terminal = terminalOf(scene, registry, source);
    const port = terminal && nearestPort(terminal, target.point, 'out');
    if (!terminal || !port) {
      return undefined;
    }
    const from = routeEnd(terminal, port);
    return [from, { point: target.point, side: sideToward(target.point, from.point) }];
  }
  const sourceTerminal = terminalOf(scene, registry, source);
  const targetTerminal = terminalOf(scene, registry, target);
  const pair = sourceTerminal && targetTerminal && pairPorts(sourceTerminal, targetTerminal);
  if (!sourceTerminal || !targetTerminal || !pair) {
    return undefined;
  }
  return [routeEnd(sourceTerminal, pair.source), routeEnd(targetTerminal, pair.target)];
};

/**
 * Every link's geometry, routed together: on a lattice scene the smart links take the gutters and are
 * then nudged apart (`@dxos/diagram`'s `Nudge`, one minor grid unit between lanes) so links sharing a
 * gutter run side by side in their own lanes, ordered so their turn-offs do not cross (DESIGN §8b).
 * Other links, and any scene without a lattice, route one by one as `linkGeometry` does.
 */
export const sceneLinkGeometry = (
  scene: Scene,
  registry: NodeRegistry,
  links: readonly Link[],
  lattice?: LatticeSpec,
): LinkGeometry[] => {
  if (!lattice) {
    return links.flatMap((link) => linkGeometry(scene, registry, link) ?? []);
  }
  const nodes = Object.values(scene.nodes);
  const rect = (bounds: { x: number; y: number; width: number; height: number }) => ({
    x: bounds.x,
    y: bounds.y,
    w: bounds.width,
    h: bounds.height,
  });
  const frameOf = (end: Endpoint) => {
    const node = isPointEndpoint(end) ? undefined : scene.nodes[end.node];
    return node ? rect(nodeBounds(node)) : undefined;
  };
  const routed = links.flatMap((link) => {
    const ends = resolveEnds(scene, registry, link.source, link.target);
    if (!ends) {
      return [];
    }
    const [from, to] = ends;
    const points = link.type === 'smart' ? (gutterRoute(nodes, lattice, from, to) ?? smartPoints(from, to)) : undefined;
    return [{ link, from, to, points }];
  });
  const smart = routed.filter((entry) => entry.points !== undefined);
  const nudged = Nudge.nudge(
    smart.map(({ link, points }) => ({
      points: points ?? [],
      source: frameOf(link.source),
      target: frameOf(link.target),
    })),
    { spacing: DEFAULT_GRID, obstacles: nodes.map((node) => rect(nodeBounds(node))) },
  );
  const lanes = new Map(smart.map((entry, index) => [entry.link.id, nudged[index]]));
  return routed.map(({ link, from, to }) => {
    const points = lanes.get(link.id);
    if (!points || points.length < 2) {
      return { link, path: linkPath(link, from, to), source: from, target: to };
    }
    // A nudged port may slide along its side, so the ends are read back from the lane.
    const source = { point: points[0], side: from.side };
    const target = { point: points[points.length - 1], side: to.side };
    return { link, path: splinePath(points), source, target };
  });
};

/** Index at which a new control point at `point` keeps the polyline `ends`+`points` in order. */
export const insertIndex = (from: Point, points: readonly Point[], to: Point, point: Point): number => {
  const polyline = [from, ...points, to];
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < polyline.length - 1; index++) {
    const distance = segmentDistance(polyline[index], polyline[index + 1], point);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
};

const segmentDistance = (a: Point, b: Point, p: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
};
