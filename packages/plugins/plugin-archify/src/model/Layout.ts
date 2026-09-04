//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Ir from './Ir';

/**
 * Deterministic geometry for the architecture IR: the same source always resolves to the same
 * rects, routes and viewBox. Nothing here invents a layout — coordinates come from the author
 * (absolute `pos`, or a fixed grid cell) and routes honour the sides the author chose.
 */

export const DEFAULT_GRID = {
  origin: [40, 80] as Ir.Point,
  cols: 4,
  gapX: 30,
  gapY: 40,
  cellW: 130,
  cellH: 64,
};

export const DEFAULTS = {
  width: 120,
  height: 60,
  margin: 40,
  /** Archify's 30/50 rule: 30px of padding, with 20px extra below the members. */
  boundaryPad: 30,
  boundaryExtraBottom: 20,
  boundaryLabelBaseline: 18,
  boundaryLabelClearance: 4,
  cornerRadius: 8,
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

export type ComponentRect = Rect & Ir.Component;

export type BoundaryRect = Rect & Ir.Boundary & { memberTop: number };

export type ResolvedConnection = {
  key: string;
  connection: Ir.Connection;
  points: readonly Ir.Point[];
  /** SVG path with rounded corners at the waypoints. */
  path: string;
  label?: { text: string; at: Ir.Point };
};

export type ResolvedDiagram = {
  components: readonly ComponentRect[];
  boundaries: readonly BoundaryRect[];
  connections: readonly ResolvedConnection[];
  /** `minX minY width height`, padded by `DEFAULTS.margin`. */
  viewBox: string;
  /** Component types actually present, in the palette's canonical order. */
  usedTypes: readonly Ir.Component['type'][];
};

const gridOf = (diagram: Ir.Architecture) =>
  diagram.layout?.mode === 'grid' ? { ...DEFAULT_GRID, ...diagram.layout } : undefined;

/** Absolute `pos` wins; otherwise the fixed grid cell. NaN signals an unplaceable component. */
export const resolvePos = (component: Ir.Component, grid?: typeof DEFAULT_GRID): Ir.Point => {
  if (component.pos) {
    return component.pos;
  }
  const { row, col } = component;
  if (!grid || !Number.isInteger(row) || !Number.isInteger(col)) {
    return [NaN, NaN];
  }
  const [ox, oy] = grid.origin;
  return [ox + (col ?? 0) * (grid.cellW + grid.gapX), oy + (row ?? 0) * (grid.cellH + grid.gapY)];
};

const measure = (component: Ir.Component, grid?: typeof DEFAULT_GRID): ComponentRect => {
  const [x, y] = resolvePos(component, grid);
  const [width, height] = component.size ?? [DEFAULTS.width, DEFAULTS.height];
  return { ...component, x, y, width, height, cx: x + width / 2, cy: y + height / 2 };
};

const boundaryRect = (boundary: Ir.Boundary, byId: Map<string, ComponentRect>): BoundaryRect | undefined => {
  const members = boundary.wraps.map((id) => byId.get(id)).filter((member): member is ComponentRect => !!member);
  if (!members.length) {
    return undefined;
  }
  const minX = Math.min(...members.map((member) => member.x));
  const minY = Math.min(...members.map((member) => member.y));
  const maxX = Math.max(...members.map((member) => member.x + member.width));
  const maxY = Math.max(...members.map((member) => member.y + member.height));
  const pad = boundary.pad ?? DEFAULTS.boundaryPad;
  // The label sits on the boundary's top rail, so the top pad has to clear its baseline.
  const topPad = Math.max(pad, DEFAULTS.boundaryLabelBaseline + DEFAULTS.boundaryLabelClearance);
  const x = minX - pad;
  const y = minY - topPad;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + topPad + DEFAULTS.boundaryExtraBottom;
  return { ...boundary, x, y, width, height, cx: x + width / 2, cy: y + height / 2, memberTop: minY };
};

export const anchor = (rect: Rect, side: Ir.Side): Ir.Point => {
  switch (side) {
    case 'left':
      return [rect.x, rect.cy];
    case 'right':
      return [rect.x + rect.width, rect.cy];
    case 'top':
      return [rect.cx, rect.y];
    case 'bottom':
      return [rect.cx, rect.y + rect.height];
  }
};

/** The side a connection leaves from when the author did not choose one. */
export const defaultFromSide = (from: Rect, to: Rect): Ir.Side => {
  if (to.cx < from.cx) {
    return 'left';
  }
  if (to.cx > from.cx) {
    return 'right';
  }
  return to.cy > from.cy ? 'bottom' : 'top';
};

export const defaultToSide = (from: Rect, to: Rect): Ir.Side => {
  if (to.cx < from.cx) {
    return 'right';
  }
  if (to.cx > from.cx) {
    return 'left';
  }
  return to.cy > from.cy ? 'top' : 'bottom';
};

const OUTWARD: Record<Ir.Side, Ir.Point> = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

const leaves = (from: Ir.Point, to: Ir.Point, side: Ir.Side): boolean => {
  const [dx, dy] = OUTWARD[side];
  return (to[0] - from[0]) * dx + (to[1] - from[1]) * dy >= -0.0001;
};

/** A route is only acceptable if it exits along `fromSide` and arrives against `toSide`. */
const honorsSides = (points: readonly Ir.Point[], fromSide: Ir.Side, toSide: Ir.Side): boolean =>
  points.length >= 2 &&
  leaves(points[0], points[1], fromSide) &&
  leaves(points[points.length - 1], points[points.length - 2], toSide);

const via = (connection: Ir.Connection, start: Ir.Point, end: Ir.Point, fromSide: Ir.Side, toSide: Ir.Side): Ir.Point[] => {
  if (connection.via?.length) {
    return connection.via.map((point) => [point[0], point[1]] as Ir.Point);
  }
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const horizontalFirst: Ir.Point[] = [
    [midX, start[1]],
    [midX, end[1]],
  ];
  const verticalFirst: Ir.Point[] = [
    [start[0], midY],
    [end[0], midY],
  ];
  switch (connection.route ?? 'auto') {
    case 'straight':
      return [];
    case 'orthogonal-h':
      return horizontalFirst;
    case 'orthogonal-v':
      return verticalFirst;
    default: {
      // A straight line is the least noisy route whenever the anchors already line up.
      const alignedEnough = Math.abs(start[0] - end[0]) < 4 || Math.abs(start[1] - end[1]) < 4;
      if (alignedEnough && honorsSides([start, end], fromSide, toSide)) {
        return [];
      }
      const candidate = [horizontalFirst, verticalFirst].find((points) =>
        honorsSides([start, ...points, end], fromSide, toSide),
      );
      return candidate ?? horizontalFirst;
    }
  }
};

/** Drops duplicate and collinear waypoints so corner rounding has real corners to work with. */
const normalize = (points: readonly Ir.Point[]): Ir.Point[] => {
  const result: Ir.Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (previous && Math.abs(point[0] - previous[0]) < 0.0001 && Math.abs(point[1] - previous[1]) < 0.0001) {
      continue;
    }
    while (result.length >= 2) {
      const [ax, ay] = result[result.length - 2];
      const [bx, by] = result[result.length - 1];
      const cross = (bx - ax) * (point[1] - by) - (by - ay) * (point[0] - bx);
      const forward = (bx - ax) * (point[0] - bx) + (by - ay) * (point[1] - by) >= -0.0001;
      if (Math.abs(cross) > 0.0001 || !forward) {
        break;
      }
      result.pop();
    }
    result.push(point);
  }
  return result;
};

export const roundedPath = (points: readonly Ir.Point[], radius: number): string => {
  if (points.length < 3 || radius <= 0) {
    return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  }
  const commands = [`M ${points[0][0]} ${points[0][1]}`];
  for (let index = 1; index < points.length - 1; index++) {
    const [px, py] = points[index - 1];
    const [cx, cy] = points[index];
    const [nx, ny] = points[index + 1];
    const previousLength = Math.hypot(cx - px, cy - py);
    const nextLength = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, previousLength / 2, nextLength / 2);
    if (r < 1) {
      commands.push(`L ${cx} ${cy}`);
      continue;
    }
    commands.push(`L ${cx - ((cx - px) / previousLength) * r} ${cy - ((cy - py) / previousLength) * r}`);
    commands.push(`Q ${cx} ${cy} ${cx + ((nx - cx) / nextLength) * r} ${cy + ((ny - cy) / nextLength) * r}`);
  }
  const [endX, endY] = points[points.length - 1];
  commands.push(`L ${endX} ${endY}`);
  return commands.join(' ');
};

/** Label anchor: explicit `labelAt`, else the midpoint of the chosen segment, nudged up 10px. */
export const labelPoint = (connection: Ir.Connection, points: readonly Ir.Point[]): Ir.Point => {
  if (connection.labelAt) {
    return [connection.labelAt[0], connection.labelAt[1]];
  }
  const dx = connection.labelDx ?? 0;
  const dy = connection.labelDy ?? 0;
  if (points.length === 2) {
    return [(points[0][0] + points[1][0]) / 2 + dx, points[0][1] - 10 + dy];
  }
  const index = Math.min(points.length - 2, Math.max(0, connection.labelSegment ?? 1));
  const [ax, ay] = points[index];
  const [bx, by] = points[index + 1];
  return [(ax + bx) / 2 + dx, (ay + by) / 2 - 10 + dy];
};

const TYPE_ORDER: Ir.Component['type'][] = [
  'frontend',
  'backend',
  'database',
  'cloud',
  'security',
  'messagebus',
  'external',
];

/** Resolves an IR document into everything the SVG renderer needs, and nothing more. */
export const resolve = (diagram: Ir.Architecture): ResolvedDiagram => {
  const grid = gridOf(diagram);
  const components = diagram.components.map((component) => measure(component, grid));
  const byId = new Map(components.map((component) => [component.id, component]));
  const boundaries = (diagram.boundaries ?? [])
    .map((boundary) => boundaryRect(boundary, byId))
    .filter((boundary): boundary is BoundaryRect => !!boundary);

  const connections: ResolvedConnection[] = [];
  for (const [index, connection] of (diagram.connections ?? []).entries()) {
    const from = byId.get(connection.from);
    const to = byId.get(connection.to);
    if (!from || !to || !Number.isFinite(from.x) || !Number.isFinite(to.x)) {
      continue;
    }
    const fromSide = connection.fromSide ?? defaultFromSide(from, to);
    const toSide = connection.toSide ?? defaultToSide(from, to);
    const start = anchor(from, fromSide);
    const end = anchor(to, toSide);
    const points = normalize([start, ...via(connection, start, end, fromSide, toSide), end]);
    connections.push({
      key: connection.id ?? `${connection.from}-${connection.to}-${index}`,
      connection,
      points,
      path: roundedPath(points, DEFAULTS.cornerRadius),
      label: connection.label ? { text: connection.label, at: labelPoint(connection, points) } : undefined,
    });
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (const rect of [...components.filter((component) => Number.isFinite(component.x)), ...boundaries]) {
    xs.push(rect.x, rect.x + rect.width);
    ys.push(rect.y, rect.y + rect.height);
  }
  for (const { points } of connections) {
    for (const [x, y] of points) {
      xs.push(x);
      ys.push(y);
    }
  }
  const minX = Math.min(0, ...xs) - DEFAULTS.margin;
  const minY = Math.min(0, ...ys) - DEFAULTS.margin;
  const maxX = Math.max(DEFAULTS.margin, ...xs) + DEFAULTS.margin;
  const maxY = Math.max(DEFAULTS.margin, ...ys) + DEFAULTS.margin;
  const [boxW, boxH] = diagram.meta.viewBox ?? [maxX - minX, maxY - minY];

  const present = new Set(components.map((component) => component.type));
  return {
    components,
    boundaries,
    connections,
    viewBox: `${minX} ${minY} ${boxW} ${boxH}`,
    usedTypes: TYPE_ORDER.filter((type) => present.has(type)),
  };
};

/** Ids reachable from `roots` by following connections in the given direction. */
export const reach = (
  diagram: Ir.Architecture,
  roots: readonly string[],
  direction: 'downstream' | 'upstream' | 'both',
): Set<string> => {
  const edges = diagram.connections ?? [];
  const seen = new Set(roots);
  const queue = [...roots];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const id = queue[cursor];
    for (const edge of edges) {
      const next =
        direction !== 'upstream' && edge.from === id
          ? edge.to
          : direction !== 'downstream' && edge.to === id
            ? edge.from
            : undefined;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
};
