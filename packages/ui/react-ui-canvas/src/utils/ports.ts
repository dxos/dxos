//
// Copyright 2026 DXOS.org
//

//
// Ports come from the node kind's definition unless the node carries its own (decision 12). A link end
// without a `port` is automatic: the closest pair is chosen from the two nodes' ports on every projection, so rearranging
// the diagram re-attaches its links.
//

import {
  type Bounds,
  DEFAULT_GRID,
  MAJOR_GRID_RATIO,
  type Node,
  type Point,
  type Port,
  type PortDirection,
  type Side,
  SIDES,
  type Size,
  sidePort,
} from '@dxos/scene';

import { type NodeRegistry, nodeDef } from '../model/index.ts';
import { nodeBounds } from './shapes.ts';

export const DEFAULT_PORTS_PER_SIDE = 3;

/** The most ports a side may carry; a stored count is clamped to `1..MAX_PORTS_PER_SIDE` whole ports. */
export const MAX_PORTS_PER_SIDE = 9;

const clampPorts = (count: number) =>
  Number.isFinite(count) ? Math.min(MAX_PORTS_PER_SIDE, Math.max(1, Math.round(count))) : DEFAULT_PORTS_PER_SIDE;

/** The letter a generated port's id names its side by, which a stored link end pinned to one still reads. */
const SIDE_LETTERS: Record<Side, string> = { top: 'n', right: 'e', bottom: 's', left: 'w' };

/**
 * The id of the `index`th port along `side`, counting from 1 at the side's start: `e1` is the top of the
 * right side, `s2` the middle of the bottom side. Pin a link end to one by naming `<node>#<portId>`.
 */
export const portId = (side: Side, index = 1): string => `${SIDE_LETTERS[side]}${index}`;

/** Whether `value` is on a line of a grid `step` apart, to within the rounding of a division. */
const onLine = (value: number, step: number): boolean => Math.abs(value / step - Math.round(value / step)) < 1e-9;

/**
 * The gap, a whole number of `step`s, that stands `count` ports about the middle of a side `extent` long with every
 * port on a line of the `step` grid and none nearer a corner than one step; of those, the gap nearest the side's even
 * share (`extent / count`, which leaves half a gap at each end), then the one with more ports on the lines twice as
 * far apart, then the wider. Undefined where the side has no such gap.
 */
const gapOnGrid = (count: number, extent: number, step: number): number | undefined => {
  const share = extent / count;
  let best: { gap: number; distance: number; lines: number } | undefined;
  for (let gap = step; (count - 1) * gap <= extent - 2 * step; gap += step) {
    const places = Array.from({ length: count }, (_, index) => extent / 2 + (index - (count - 1) / 2) * gap);
    if (!places.every((place) => onLine(place, step))) {
      continue;
    }
    const distance = Math.abs(gap - share);
    const lines = places.filter((place) => onLine(place, 2 * step)).length;
    // Gaps come widest last, so of two as near and as much on the lines the wider is kept.
    if (!best || distance < best.distance - 1e-9 || (distance <= best.distance + 1e-9 && lines >= best.lines)) {
      best = { gap, distance, lines };
    }
  }
  return best?.gap;
};

/**
 * How far apart `count` ports stand on a side `extent` long, about its middle, so that links leave a shape on the
 * grid's lines: a gap of half major cells that lands every port on a half line, as many as it can on a whole one
 * (`gapOnGrid`), on a drawing whose minor grid is `grid` scene px. A side with no room for that takes the same rule
 * on the minor grid and then on half of it, and a side that fits none, or is itself off the grid, is shared evenly.
 */
export const portPitch = (count: number, extent: number, grid = DEFAULT_GRID): number => {
  if (count > 1 && grid > 0) {
    for (let step = (grid * MAJOR_GRID_RATIO) / 2; step >= grid / 2; step /= 2) {
      const gap = gapOnGrid(count, extent, step);
      if (gap !== undefined) {
        return gap;
      }
    }
  }
  return extent / (count + 1);
};

/**
 * `count` ports along each side of a frame of `size`, named by `portId`, `portPitch` apart and symmetrical about the
 * side's centre. Each side lists its centre port first so an automatic link ties to the centre.
 */
export const sidePorts = (count: number, size: Size, grid = DEFAULT_GRID): readonly Port[] => {
  const middle = (count + 1) / 2;
  const indices = Array.from({ length: count }, (_, index) => index + 1).sort(
    (left, right) => Math.abs(left - middle) - Math.abs(right - middle) || left - right,
  );
  return SIDES.flatMap((side) => {
    const extent = side === 'top' || side === 'bottom' ? size.width : size.height;
    // The step as a fraction of the side, which is what a port states; a side with no length has only its middle.
    const step = extent > 0 ? portPitch(count, extent, grid) / extent : 0;
    return indices.map((index) => sidePort(portId(side, index), side, 0.5 + (index - middle) * step));
  });
};

/** How many ports a node spreads along each side: its own count, else its kind's, else the default. */
export const portsPerSideOf = (registry: NodeRegistry, node: Node): number =>
  clampPorts(node.portsPerSide ?? nodeDef(registry, node)?.portsPerSide ?? DEFAULT_PORTS_PER_SIDE);

/**
 * A node's ports: its own when it carries them, else its own `portsPerSide` along each side, else its kind's layout or
 * count, spaced by the drawing's minor grid (`grid`, scene px). Ports landing on the same point collapse to the first,
 * so a definition cannot stack two at one place.
 */
export const nodePorts = (registry: NodeRegistry, node: Node, grid = DEFAULT_GRID): readonly Port[] => {
  const def = nodeDef(registry, node);
  const bounds = nodeBounds(node);
  const ports =
    node.ports ??
    (node.portsPerSide !== undefined ? sidePorts(clampPorts(node.portsPerSide), bounds, grid) : undefined) ??
    def?.ports?.(node) ??
    sidePorts(clampPorts(def?.portsPerSide ?? DEFAULT_PORTS_PER_SIDE), bounds, grid);
  const seen = new Set<string>();
  return ports.filter((port) => {
    const { x, y } = portPoint(bounds, port);
    const key = `${x},${y}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** A port's point in the frame: exactly its fraction of each axis, whatever the grid. */
export const portPoint = (bounds: Bounds, port: Pick<Port, 'x' | 'y'>): Point => ({
  x: bounds.x + bounds.width * port.x,
  y: bounds.y + bounds.height * port.y,
});

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', right: 'left', left: 'right' };

export const oppositeSide = (side: Side): Side => OPPOSITE[side];

/** Outward unit normal of a side. */
export const sideNormal = (side: Side): Point => {
  switch (side) {
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
  }
};

/**
 * Where a link leaving `point` toward `side` crosses the frame it is on: the point itself for a port on that edge,
 * and the edge straight out from a port inside the frame, so its stub is measured from the shape rather than within it.
 */
export const frameExit = (point: Point, side: Side, bounds: Bounds | undefined): Point => {
  if (!bounds) {
    return point;
  }
  switch (side) {
    case 'top':
      return { x: point.x, y: Math.min(point.y, bounds.y) };
    case 'bottom':
      return { x: point.x, y: Math.max(point.y, bounds.y + bounds.height) };
    case 'left':
      return { x: Math.min(point.x, bounds.x), y: point.y };
    case 'right':
      return { x: Math.max(point.x, bounds.x + bounds.width), y: point.y };
  }
};

/** Whether a port takes a link end of `direction` (`out` leaves it, `in` arrives); an unlabelled port takes either. */
export const portAccepts = (port: Port, direction: Exclude<PortDirection, 'any'>): boolean =>
  (port.accepts ?? 'any') === 'any' || port.accepts === direction;

export type PortTerminal = {
  bounds: Bounds;
  ports: readonly Port[];
  /** Pinned port id; absent means automatic. */
  port?: string;
};

export type PortPair = { source: Port; target: Port };

const distance2 = (left: Point, right: Point) => (left.x - right.x) ** 2 + (left.y - right.y) ** 2;

/**
 * The port pair joining two nodes: pinned ports are honoured, automatic ends take the port that
 * minimises the distance to the other end (ties broken by port order, so the result is stable). The
 * source end only leaves a port that accepts `out`, the target end only lands on one that accepts `in`.
 */
export const pairPorts = (source: PortTerminal, target: PortTerminal): PortPair | undefined => {
  const sources = portCandidates(source, 'out');
  const targets = portCandidates(target, 'in');
  if (sources.length === 0 || targets.length === 0) {
    return undefined;
  }
  let best: PortPair | undefined;
  let bestDistance = Infinity;
  for (const from of sources) {
    const fromPoint = portPoint(source.bounds, from);
    for (const to of targets) {
      const value = distance2(fromPoint, portPoint(target.bounds, to));
      if (value < bestDistance) {
        bestDistance = value;
        best = { source: from, target: to };
      }
    }
  }
  return best;
};

/** The port of `terminal` closest to `point` among those taking `direction`, for a link whose other end is free. */
export const nearestPort = (
  terminal: PortTerminal,
  point: Point,
  direction: Exclude<PortDirection, 'any'>,
): Port | undefined => {
  let best: Port | undefined;
  let bestDistance = Infinity;
  for (const port of portCandidates(terminal, direction)) {
    const value = distance2(portPoint(terminal.bounds, port), point);
    if (value < bestDistance) {
      bestDistance = value;
      best = port;
    }
  }
  return best;
};

/** The ports an end may use: those accepting its direction, narrowed to the pinned one when it is among them. */
export const portCandidates = (
  { ports, port }: PortTerminal,
  direction: Exclude<PortDirection, 'any'>,
): readonly Port[] => {
  const allowed = ports.filter((candidate) => portAccepts(candidate, direction));
  if (port === undefined) {
    return allowed;
  }
  const pinned = allowed.find((candidate) => candidate.id === port);
  // A pinned port the definition no longer has, or that refuses the end, falls back to automatic rather
  // than dropping the link.
  return pinned ? [pinned] : allowed;
};
