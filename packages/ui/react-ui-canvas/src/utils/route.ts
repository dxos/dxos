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
import {
  DEFAULT_GRID,
  type Endpoint,
  MAJOR_GRID,
  type Point,
  type Port,
  type PortEndpoint,
  type Side,
  isPointEndpoint,
} from '@dxos/scene';

import { type Link, type Node, type NodeRegistry, type View, isCloudNode, isEllipseNode } from '../model/index.ts';
import { type DiagramRoute, diagramRoute, isRouteObstacle } from './diagram-shape.ts';
import { gutterRoute, gutterRouteWithCost } from './gutter-route.ts';
import { type LatticeSpec } from './lattice.ts';
import {
  type PortTerminal,
  nearestPort,
  nodePorts,
  pairPorts,
  portCandidates,
  portPoint,
  sideNormal,
} from './ports.ts';
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

/**
 * A resolved link end. `free` marks a point end (one being dragged, or left on empty canvas): it has no port to
 * leave along, so a route runs straight to it rather than turning to its side's normal.
 */
export type RouteEnd = { point: Point; side: Side; free?: boolean };

const pt = ({ x, y }: Point) => `${x} ${y}`;

export const linePath = (from: Point, to: Point): string => `M ${pt(from)} L ${pt(to)}`;

const curveControls = (from: RouteEnd, to: RouteEnd): [Point, Point] => {
  const dx = to.point.x - from.point.x;
  const dy = to.point.y - from.point.y;
  const tangent = Math.max(MIN_TANGENT, Math.hypot(dx, dy) * TANGENT_RATIO);
  // A free end takes no tangent: its control point sits on the end, so the curve arrives straight at it.
  const control = (end: RouteEnd): Point => {
    const normal = sideNormal(end.side);
    return end.free ? end.point : { x: end.point.x + normal.x * tangent, y: end.point.y + normal.y * tangent };
  };
  return [control(from), control(to)];
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
      // A free end (one being dragged) takes no gutter: the route runs straight to it.
      return splinePath(
        (lattice && !from.free && !to.free && gutterRoute(lattice.nodes, lattice.spec, from, to)) ||
          smartPoints(from, to),
      );
    default:
      // A link type this engine does not know (saved by a newer one) draws as the core base: a straight line.
      return linePath(from.point, to.point);
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
  // A free end has no stub: the route runs straight to it.
  const stub = (end: RouteEnd): Point[] => {
    const normal = sideNormal(end.side);
    return end.free ? [] : [{ x: end.point.x + normal.x * SMART_STUB, y: end.point.y + normal.y * SMART_STUB }];
  };
  return [from.point, ...stub(from), ...stub(to).reverse(), to.point];
};

export type LinkGeometry = {
  link: Link;
  path: string;
  source: RouteEnd;
  target: RouteEnd;
  /** A diagram connector's route, which the diagram renderer draws in place of `path`. */
  diagram?: DiagramRoute;
};

/** The straight segments through `points`, as the diagram renderer draws a route. */
const polylinePath = (points: readonly Point[]): string =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${pt(point)}`).join(' ');

/** A diagram connector between two nodes, routed as the diagram renderer draws it (`diagramRoute`). */
const diagramGeometry = (scene: View, link: Link): LinkGeometry | undefined => {
  if (!link.connector || isPointEndpoint(link.source) || isPointEndpoint(link.target)) {
    return undefined;
  }
  const [source, target] = [scene.nodes[link.source.node], scene.nodes[link.target.node]];
  if (!source || !target) {
    return undefined;
  }
  const obstacles = Object.values(scene.nodes)
    .filter((node) => node !== source && node !== target && isRouteObstacle(node))
    .map(nodeBounds);
  const route = diagramRoute(link.connector, nodeBounds(source), nodeBounds(target), obstacles);
  const { points } = route;
  if (points.length < 2) {
    return undefined;
  }
  const [first, second, last, previous] = [points[0], points[1], points[points.length - 1], points[points.length - 2]];
  return {
    link,
    path: polylinePath(points),
    source: { point: first, side: sideToward(first, second) },
    target: { point: last, side: sideToward(last, previous) },
    diagram: route,
  };
};

/** The side of a free end: the one facing the other end, so the route leaves it toward that end. */
export const sideToward = (from: Point, to: Point): Side => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'e' : 'w') : dy >= 0 ? 's' : 'n';
};

/** A node end as the port picker sees it, or nothing when the node is gone. */
const terminalOf = (scene: View, registry: NodeRegistry, end: PortEndpoint): PortTerminal | undefined => {
  const node = scene.nodes[end.node];
  return node ? { bounds: nodeBounds(node), ports: nodePorts(registry, node), port: end.port } : undefined;
};

const routeEnd = (terminal: PortTerminal, port: Port): RouteEnd => ({
  point: portPoint(terminal.bounds, port),
  side: port.side,
});

/** Port pairs searched per tier of fewest possible bends. */
const PAIRS_PER_TIER = 3;

/**
 * The fewest bends any right-angled route between two ports could take: none when they face each other on one line,
 * one when their sides are perpendicular and each points toward the corner they share, otherwise at least two.
 */
const leastBends = (from: RouteEnd, to: RouteEnd): number => {
  const out = sideNormal(from.side);
  // A route arrives at its target moving against the target side's normal.
  const arrive = sideNormal(to.side);
  const [dx, dy] = [to.point.x - from.point.x, to.point.y - from.point.y];
  const ahead = (normal: Point, x: number, y: number) => normal.x * x + normal.y * y > 0;
  if (out.x === -arrive.x && out.y === -arrive.y) {
    const aligned = out.x !== 0 ? dy === 0 : dx === 0;
    return aligned && ahead(out, dx, dy) ? 0 : 2;
  }
  if (out.x * arrive.x + out.y * arrive.y === 0) {
    // The corner is where the source's line meets the target's.
    const corner = out.x !== 0 ? { x: to.point.x, y: from.point.y } : { x: from.point.x, y: to.point.y };
    const first = ahead(out, corner.x - from.point.x, corner.y - from.point.y);
    const second = ahead({ x: -arrive.x, y: -arrive.y }, to.point.x - corner.x, to.point.y - corner.y);
    return first && second ? 1 : 2;
  }
  return 2;
};

/**
 * The ends and gutter route of a smart link between two nodes on a lattice: of the pairs of side-centre ports (or the
 * pinned ones), the one whose route is cheapest, fewest bends first, so a link leaves straight down a free column
 * rather than from the nearest port round a corner. Pairs are tried nearest first, so a tie keeps the nearest.
 */
export const latticeEnds = (
  scene: View,
  registry: NodeRegistry,
  link: Link,
  route: LatticeRoute,
): { from: RouteEnd; to: RouteEnd; points: Point[] } | undefined => {
  if (link.type !== 'smart' || isPointEndpoint(link.source) || isPointEndpoint(link.target)) {
    return undefined;
  }
  const source = terminalOf(scene, registry, link.source);
  const target = terminalOf(scene, registry, link.target);
  if (!source || !target) {
    return undefined;
  }
  // A side's centre, where a side has one; a pinned port or a custom layout keeps what it offers.
  const centres = (ports: readonly Port[]) => {
    const middle = ports.filter((port) => port.offset === 0.5);
    return middle.length > 0 ? middle : ports;
  };
  const sources = centres(portCandidates(source, 'out'));
  const targets = centres(portCandidates(target, 'in'));
  // Fewest possible bends first, then nearest: the search stops once no pair left could bend less than the best found.
  const pairs = sources
    .flatMap((from) => targets.map((to) => ({ from: routeEnd(source, from), to: routeEnd(target, to) })))
    .map((pair) => ({
      ...pair,
      least: leastBends(pair.from, pair.to),
      distance: Math.hypot(pair.from.point.x - pair.to.point.x, pair.from.point.y - pair.to.point.y),
    }))
    .sort((left, right) => left.least - right.least || left.distance - right.distance);
  let best: { from: RouteEnd; to: RouteEnd; points: Point[]; bends: number } | undefined;
  // Within a tier only the nearest few are searched: a farther pair seldom routes better, and each search has a cost.
  const tried = new Map<number, number>();
  for (const pair of pairs) {
    if (best && pair.least >= best.bends) {
      break;
    }
    const count = tried.get(pair.least) ?? 0;
    if (count >= PAIRS_PER_TIER) {
      continue;
    }
    tried.set(pair.least, count + 1);
    const routed = gutterRouteWithCost(route.nodes, route.spec, pair.from, pair.to);
    // The route's points are its ends and its corners.
    const bends = routed ? routed.points.length - 2 : Infinity;
    if (routed && (!best || bends < best.bends)) {
      best = { from: pair.from, to: pair.to, points: routed.points, bends };
    }
  }
  return best;
};

/**
 * Resolve a link's ends and route it by its type: two node ends take the automatic (or pinned) port pair,
 * a node end facing a free point takes the port nearest that point, and two free points face each other.
 */
export const linkGeometry = (
  scene: View,
  registry: NodeRegistry,
  link: Link,
  lattice?: LatticeSpec,
): LinkGeometry | undefined => {
  const diagram = diagramGeometry(scene, link);
  if (diagram) {
    return diagram;
  }
  const route = lattice ? { spec: lattice, nodes: Object.values(scene.nodes) } : undefined;
  const routed = route && latticeEnds(scene, registry, link, route);
  if (routed) {
    return { link, path: splinePath(routed.points), source: routed.from, target: routed.to };
  }
  const ends = resolveEnds(scene, registry, link.source, link.target, link.type);
  if (!ends) {
    return undefined;
  }
  const [from, to] = ends;
  return { link, path: linkPath(link, from, to, route), source: from, target: to };
};

/**
 * Where a line aimed at `node`'s centre from `toward` meets its outline (an ellipse for ellipses and clouds, else its
 * frame), and the side it crosses: a plain line to a node bound to no port points straight at the shape.
 */
const centredEnd = (node: Node, toward: Point): RouteEnd => {
  const { center } = node;
  const [halfWidth, halfHeight] = [node.size.width / 2, node.size.height / 2];
  const [dx, dy] = [toward.x - center.x, toward.y - center.y];
  if ((dx === 0 && dy === 0) || halfWidth === 0 || halfHeight === 0) {
    return { point: center, side: 'e' };
  }
  const round = isEllipseNode(node) || isCloudNode(node);
  const scale = round
    ? 1 / Math.hypot(dx / halfWidth, dy / halfHeight)
    : Math.min(dx === 0 ? Infinity : halfWidth / Math.abs(dx), dy === 0 ? Infinity : halfHeight / Math.abs(dy));
  return {
    point: { x: center.x + dx * scale, y: center.y + dy * scale },
    side: sideToward(center, toward),
  };
};

/**
 * A plain (non-smart) link's ends: a free point stays where it is, a named port is used as given, and a node end with
 * no port points at the node's centre, from the other end's centre (or port, or point), stopping at its outline.
 */
const centredEnds = (scene: View, registry: NodeRegistry, source: Endpoint, target: Endpoint) => {
  const anchor = (end: Endpoint): Point | undefined => {
    if (isPointEndpoint(end)) {
      return end.point;
    }
    const terminal = terminalOf(scene, registry, end);
    const port = end.port === undefined ? undefined : terminal?.ports.find((candidate) => candidate.id === end.port);
    return terminal && port ? portPoint(terminal.bounds, port) : scene.nodes[end.node]?.center;
  };
  const [from, to] = [anchor(source), anchor(target)];
  if (!from || !to) {
    return undefined;
  }
  const endOf = (end: Endpoint, other: Point): RouteEnd | undefined => {
    if (isPointEndpoint(end)) {
      return { point: end.point, side: sideToward(end.point, other), free: true };
    }
    const node = scene.nodes[end.node];
    if (!node) {
      return undefined;
    }
    const terminal = terminalOf(scene, registry, end);
    const port = end.port === undefined ? undefined : terminal?.ports.find((candidate) => candidate.id === end.port);
    return terminal && port ? routeEnd(terminal, port) : centredEnd(node, other);
  };
  const sourceEnd = endOf(source, to);
  const targetEnd = endOf(target, from);
  return sourceEnd && targetEnd ? ([sourceEnd, targetEnd] as [RouteEnd, RouteEnd]) : undefined;
};

const resolveEnds = (
  scene: View,
  registry: NodeRegistry,
  source: Endpoint,
  target: Endpoint,
  type?: Link['type'],
): [RouteEnd, RouteEnd] | undefined => {
  if (type !== undefined && type !== 'smart') {
    return centredEnds(scene, registry, source, target);
  }
  if (isPointEndpoint(source)) {
    if (isPointEndpoint(target)) {
      return [
        { point: source.point, side: sideToward(source.point, target.point), free: true },
        { point: target.point, side: sideToward(target.point, source.point), free: true },
      ];
    }
    const terminal = terminalOf(scene, registry, target);
    const port = terminal && nearestPort(terminal, source.point, 'in');
    if (!terminal || !port) {
      return undefined;
    }
    const to = routeEnd(terminal, port);
    return [{ point: source.point, side: sideToward(source.point, to.point), free: true }, to];
  }
  if (isPointEndpoint(target)) {
    const terminal = terminalOf(scene, registry, source);
    const port = terminal && nearestPort(terminal, target.point, 'out');
    if (!terminal || !port) {
      return undefined;
    }
    const from = routeEnd(terminal, port);
    return [from, { point: target.point, side: sideToward(target.point, from.point), free: true }];
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
export const viewLinkGeometry = (
  scene: View,
  registry: NodeRegistry,
  links: readonly Link[],
  lattice?: LatticeSpec,
): LinkGeometry[] => {
  if (!lattice) {
    return links.flatMap((link) => linkGeometry(scene, registry, link) ?? []);
  }
  // A diagram connector keeps its own route, so it neither takes the gutters nor is nudged into a lane.
  const diagrams = new Map(
    links.flatMap((link) => {
      const geometry = diagramGeometry(scene, link);
      return geometry ? [[link.id, geometry] as const] : [];
    }),
  );
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
  const route = { spec: lattice, nodes };
  const routed = links
    .filter((link) => !diagrams.has(link.id))
    .flatMap((link) => {
      const chosen = latticeEnds(scene, registry, link, route);
      if (chosen) {
        return [{ link, from: chosen.from, to: chosen.to, points: chosen.points }];
      }
      const ends = resolveEnds(scene, registry, link.source, link.target, link.type);
      if (!ends) {
        return [];
      }
      const [from, to] = ends;
      const points =
        link.type === 'smart' ? (gutterRoute(nodes, lattice, from, to) ?? smartPoints(from, to)) : undefined;
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
  const geometries = new Map(
    routed.map(({ link, from, to }) => {
      const points = lanes.get(link.id);
      if (!points || points.length < 2) {
        return [link.id, { link, path: linkPath(link, from, to), source: from, target: to }] as const;
      }
      // A nudged port may slide along its side, so the ends are read back from the lane.
      const source = { point: points[0], side: from.side };
      const target = { point: points[points.length - 1], side: to.side };
      return [link.id, { link, path: splinePath(points), source, target }] as const;
    }),
  );
  // In the order given, which is the paint order.
  return links.flatMap((link) => diagrams.get(link.id) ?? geometries.get(link.id) ?? []);
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
