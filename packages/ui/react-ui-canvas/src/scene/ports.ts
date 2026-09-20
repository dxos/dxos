//
// Copyright 2026 DXOS.org
//

//
// Ports come from the cell definition, not the data (decision 12). A link end without a `port` is
// automatic: the closest pair is chosen from the two cells' ports on every projection, so rearranging
// the diagram re-attaches its links.
//

import { type Bounds, type Point, type Port, type Side } from './types.ts';

export const SIDES: readonly Side[] = ['n', 'e', 's', 'w'];

/** One port centred on each side. */
export const defaultPorts: readonly Port[] = SIDES.map((side) => ({ id: side, side, offset: 0.5 }));

export const portPoint = (bounds: Bounds, port: Port): Point => {
  switch (port.side) {
    case 'n':
      return { x: bounds.x + bounds.width * port.offset, y: bounds.y };
    case 's':
      return { x: bounds.x + bounds.width * port.offset, y: bounds.y + bounds.height };
    case 'w':
      return { x: bounds.x, y: bounds.y + bounds.height * port.offset };
    case 'e':
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height * port.offset };
  }
};

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
 * The port pair joining two cells: pinned ports are honoured, automatic ends take the port that
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
