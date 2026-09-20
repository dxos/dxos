//
// Copyright 2026 DXOS.org
//

//
// Ports come from the node type's definition unless the node carries its own (decision 12). A link end
// without a `port` is automatic: the closest pair is chosen from the two nodes' ports on every projection, so rearranging
// the diagram re-attaches its links.
//

import { type NodeRegistry } from '../model/registry.ts';
import { type Bounds, MAJOR_GRID, type Node, type Point, type Port, type Side } from '../model/types.ts';
import { nodeBounds } from './shapes.ts';

export const SIDES: readonly Side[] = ['n', 'e', 's', 'w'];

export const DEFAULT_PORTS_PER_SIDE = 3;

/**
 * `count` ports spread evenly along each side, named `<side><index>` from the side's start (`e1` is the
 * top of the east side). Each side lists its centre port first so an automatic link ties to the centre.
 */
export const sidePorts = (count = DEFAULT_PORTS_PER_SIDE): readonly Port[] => {
  const middle = (count + 1) / 2;
  const indices = Array.from({ length: count }, (_, index) => index + 1).sort(
    (left, right) => Math.abs(left - middle) - Math.abs(right - middle) || left - right,
  );
  return SIDES.flatMap((side) =>
    indices.map((index) => ({ id: `${side}${index}`, side, offset: index / (count + 1) })),
  );
};

export const defaultPorts: readonly Port[] = sidePorts();

/**
 * A node's ports: its own when it carries them, else its type's, else `portsPerSide` of the type. Ports
 * that snap onto the same grid point collapse to the first (a small node keeps fewer ports).
 */
export const nodePorts = (registry: NodeRegistry, node: Node): readonly Port[] => {
  const def = registry[node.type];
  const ports = node.ports ?? def.ports?.(node) ?? sidePorts(def.portsPerSide);
  const bounds = nodeBounds(node);
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

/**
 * A port's point on the frame: its offset along the side, snapped to the nearest major grid line inside
 * the side. A side too short to contain one puts every port at its centre; a port is never at a corner.
 */
export const portPoint = (bounds: Bounds, port: Port, unit = MAJOR_GRID): Point => {
  switch (port.side) {
    case 'n':
      return { x: along(bounds.x, bounds.width, port.offset, unit), y: bounds.y };
    case 's':
      return { x: along(bounds.x, bounds.width, port.offset, unit), y: bounds.y + bounds.height };
    case 'w':
      return { x: bounds.x, y: along(bounds.y, bounds.height, port.offset, unit) };
    case 'e':
      return { x: bounds.x + bounds.width, y: along(bounds.y, bounds.height, port.offset, unit) };
  }
};

const along = (origin: number, length: number, offset: number, unit: number): number => {
  const position = origin + length * offset;
  const first = Math.floor(origin / unit) * unit + unit;
  const last = Math.ceil((origin + length) / unit) * unit - unit;
  if (first > last) {
    return origin + length / 2;
  }
  return Math.min(Math.max(Math.round(position / unit) * unit, first), last);
};

const OPPOSITE: Record<Side, Side> = { n: 's', s: 'n', e: 'w', w: 'e' };

export const oppositeSide = (side: Side): Side => OPPOSITE[side];

/** Outward unit normal of a side. */
export const sideNormal = (side: Side): Point => {
  switch (side) {
    case 'n':
      return { x: 0, y: -1 };
    case 's':
      return { x: 0, y: 1 };
    case 'w':
      return { x: -1, y: 0 };
    case 'e':
      return { x: 1, y: 0 };
  }
};

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
 * minimises the distance to the other end (ties broken by port order, so the result is stable).
 */
export const pairPorts = (source: PortTerminal, target: PortTerminal): PortPair | undefined => {
  const sources = candidates(source);
  const targets = candidates(target);
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

const candidates = ({ ports, port }: PortTerminal): readonly Port[] => {
  if (port === undefined) {
    return ports;
  }
  const pinned = ports.find((candidate) => candidate.id === port);
  // A pinned port the definition no longer has falls back to automatic rather than dropping the link.
  return pinned ? [pinned] : ports;
};
