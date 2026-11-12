//
// Copyright 2026 DXOS.org
//

//
// Hull geometry: the border a hull draws round the nodes inside it. Off a lattice the border is the box that bounds
// them or their convex hull, a margin out. On a lattice it runs along gutter centre lines, round the tiles its nodes
// stand on: a tile is a cell and half of each gutter beside it, so the tiles cover the plane and a border between two
// of them splits the gutter into a track inside the hull and a track outside it.
//

import {
  type Bounds,
  DEFAULT_GRID,
  type HullNode,
  type HullShape,
  type Node,
  type NodeStyle,
  type Point,
  isHullNode,
} from '@dxos/scene';

import { type RenderList2D } from '../model/index.ts';
import { type LatticeSpec, onLattice, toCell } from './lattice.ts';
import { between, sortByZ } from './order.ts';
import { createNode, nodeBounds } from './shapes.ts';

/**
 * The look a hull is made with: an outline, dashed. An ordinary style rather than a guide's, which is dashed and
 * unfilled whatever it is set to, so a hull's border, fill and line are the ones its style asks for.
 */
export const HULL_STYLE: NodeStyle = { tone: 0, lineStyle: 'dashed' };

/** How far a hull's border stands off the nodes inside it where no lattice places it, in scene px. */
export const HULL_MARGIN = DEFAULT_GRID * 2;

/** An axis-aligned run of a hull's border on a lattice. */
export type Wall = { readonly from: Point; readonly to: Point };

/** A hull's reach on a lattice: the tiles it covers and the runs of its border. */
export type HullRegion = { readonly id: string; readonly tiles: ReadonlySet<string>; readonly walls: readonly Wall[] };

/**
 * The borders a gutter route answers to. No route runs along a border, and each border has a track either side of
 * it; a route crosses only the borders that are not `closed` to it.
 */
export type HullWalls = {
  readonly borders: readonly Wall[];
  /** The borders of the hulls that hold both ends of the route or neither, which it therefore has no cause to cross. */
  readonly closed: readonly Wall[];
  /** The borders of the hulls that hold one end of the route, each of which it must cross, and should cross once. */
  readonly open: readonly Wall[];
  /** How many hulls hold one end of the route: the fewest borders any route between its ends can cross. */
  readonly least: number;
};

type Tile = { readonly col: number; readonly row: number };

const tileKey = ({ col, row }: Tile): string => `${col},${row}`;

const tileOf = (key: string): Tile => {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
};

const NEIGHBOURS: readonly Tile[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
];

/** The nodes directly inside each hull, by the hull's id. */
const childrenOf = (nodes: readonly Node[]): Map<string, Node[]> => {
  const children = new Map<string, Node[]>();
  for (const node of nodes) {
    if (node.parent !== undefined) {
      children.set(node.parent, [...(children.get(node.parent) ?? []), node]);
    }
  }
  return children;
};

/**
 * The nodes inside a hull, through any hull inside it. A hull is not one of them: it stands nowhere of its own, only
 * round what is inside it. A hull named as its own ancestor is followed once, so the walk ends.
 */
export const hullMembers = (nodes: readonly Node[], hullId: string): Node[] => {
  const children = childrenOf(nodes);
  const seen = new Set<string>([hullId]);
  const members: Node[] = [];
  const visit = (id: string) => {
    for (const child of children.get(id) ?? []) {
      if (seen.has(child.id)) {
        continue;
      }
      seen.add(child.id);
      if (isHullNode(child)) {
        visit(child.id);
      } else {
        members.push(child);
      }
    }
  };
  visit(hullId);
  return members;
};

/** How many hulls a node is inside, counting each once. */
const depthOf = (nodes: Readonly<Record<string, Node>>, node: Node): number => {
  const seen = new Set<string>([node.id]);
  let depth = 0;
  for (let parent = node.parent; parent !== undefined && !seen.has(parent); parent = nodes[parent]?.parent) {
    seen.add(parent);
    depth++;
  }
  return depth;
};

/** Every tile a lattice node stands on. */
const nodeTiles = (node: Node, spec: LatticeSpec): Tile[] => {
  const { col, row, spanX, spanY } = toCell(nodeBounds(node), spec);
  return Array.from({ length: spanX * spanY }, (_, index) => ({
    col: col + (index % spanX),
    row: row + Math.floor(index / spanX),
  }));
};

/** The tile a lattice node is on (its first, for a node spanning several), which says which hulls it is inside. */
export const tileOfNode = (node: Node, spec: LatticeSpec): string => {
  const { col, row } = toCell(nodeBounds(node), spec);
  return tileKey({ col, row });
};

/** The groups of tiles joined edge to edge. */
const components = (tiles: ReadonlySet<string>): Set<string>[] => {
  const left = new Set(tiles);
  const groups: Set<string>[] = [];
  for (const start of tiles) {
    if (!left.has(start)) {
      continue;
    }
    const group = new Set<string>([start]);
    left.delete(start);
    for (const queue = [start]; queue.length > 0;) {
      const { col, row } = tileOf(queue.pop() ?? start);
      for (const step of NEIGHBOURS) {
        const next = tileKey({ col: col + step.col, row: row + step.row });
        if (left.has(next)) {
          left.delete(next);
          group.add(next);
          queue.push(next);
        }
      }
    }
    groups.push(group);
  }
  return groups;
};

/**
 * The shortest run of tiles from `from` to any tile of `to`, a tile at a time through those `open` lets it take, kept
 * within a tile of the two groups' bounds; the tiles strictly between them, or undefined when `open` leaves no way.
 */
const bridge = (
  from: ReadonlySet<string>,
  to: ReadonlySet<string>,
  open: (key: string) => boolean,
): string[] | undefined => {
  const all = [...from, ...to].map(tileOf);
  const [minCol, maxCol] = [Math.min(...all.map(({ col }) => col)) - 1, Math.max(...all.map(({ col }) => col)) + 1];
  const [minRow, maxRow] = [Math.min(...all.map(({ row }) => row)) - 1, Math.max(...all.map(({ row }) => row)) + 1];
  const previous = new Map<string, string | undefined>([...from].map((key) => [key, undefined]));
  const queue = [...from];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const { col, row } = tileOf(current);
    for (const step of NEIGHBOURS) {
      const tile = { col: col + step.col, row: row + step.row };
      const next = tileKey(tile);
      if (previous.has(next) || tile.col < minCol || tile.col > maxCol || tile.row < minRow || tile.row > maxRow) {
        continue;
      }
      if (to.has(next)) {
        const path: string[] = [];
        for (let back: string | undefined = current; back !== undefined && !from.has(back); back = previous.get(back)) {
          path.push(back);
        }
        return path;
      }
      if (open(next)) {
        previous.set(next, current);
        queue.push(next);
      }
    }
  }
  return undefined;
};

/**
 * The tiles a hull covers on a lattice. A `box` covers the rectangle that bounds its nodes' tiles. A `perimeter`
 * covers just those tiles, joined into one piece where they stand apart by the shortest run of tiles between them,
 * through tiles no other node stands on where there is such a run.
 */
export const hullTiles = (nodes: readonly Node[], hull: HullNode, spec: LatticeSpec): Set<string> => {
  const members = hullMembers(nodes, hull.id).filter(onLattice);
  const inside = new Set(members.map((member) => member.id));
  const tiles = new Set(members.flatMap((member) => nodeTiles(member, spec)).map(tileKey));
  if (tiles.size === 0) {
    return tiles;
  }
  if (hull.shape === 'box') {
    const all = [...tiles].map(tileOf);
    const [minCol, maxCol] = [Math.min(...all.map(({ col }) => col)), Math.max(...all.map(({ col }) => col))];
    const [minRow, maxRow] = [Math.min(...all.map(({ row }) => row)), Math.max(...all.map(({ row }) => row))];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        tiles.add(tileKey({ col, row }));
      }
    }
    return tiles;
  }
  const taken = new Set(
    nodes
      .filter((node) => onLattice(node) && !inside.has(node.id))
      .flatMap((node) => nodeTiles(node, spec))
      .map(tileKey),
  );
  for (let groups = components(tiles); groups.length > 1; groups = components(tiles)) {
    const [first, ...rest] = groups;
    const others = new Set(rest.flatMap((group) => [...group]));
    const path = bridge(first, others, (key) => !taken.has(key)) ?? bridge(first, others, () => true);
    // Groups are apart by at least a tile, so a run found always adds one and the loop ends.
    if (!path || path.length === 0) {
      break;
    }
    path.forEach((key) => tiles.add(key));
  }
  return tiles;
};

type Edge = { readonly from: Point; readonly to: Point };

const pointKey = ({ x, y }: Point): string => `${x},${y}`;

const ringArea = (ring: readonly Point[]): number =>
  Math.abs(
    ring.reduce((sum, point, index) => {
      const next = ring[(index + 1) % ring.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );

/** Drops the middle of any three points in a line, so only the corners of a closed ring remain. */
const corners = (ring: readonly Point[]): Point[] =>
  ring.filter((point, index) => {
    const before = ring[(index + ring.length - 1) % ring.length];
    const after = ring[(index + 1) % ring.length];
    return !((before.x === point.x && point.x === after.x) || (before.y === point.y && point.y === after.y));
  });

/**
 * The border of a set of tiles, as the corners of its outer ring in scene coordinates, clockwise: every edge lies on
 * a gutter centre line. A hole (a tile the set surrounds without covering) is not part of it.
 */
export const tilesOutline = (tiles: ReadonlySet<string>, spec: LatticeSpec): Point[] => {
  const [pitchX, pitchY] = [spec.width + spec.gutterX, spec.height + spec.gutterY];
  const edges: Edge[] = [];
  for (const key of tiles) {
    const { col, row } = tileOf(key);
    const [left, right] = [(col - 0.5) * pitchX, (col + 0.5) * pitchX];
    const [top, bottom] = [(row - 0.5) * pitchY, (row + 0.5) * pitchY];
    // Clockwise round the tile, so the set is on the right of every edge kept.
    if (!tiles.has(tileKey({ col, row: row - 1 }))) {
      edges.push({ from: { x: left, y: top }, to: { x: right, y: top } });
    }
    if (!tiles.has(tileKey({ col: col + 1, row }))) {
      edges.push({ from: { x: right, y: top }, to: { x: right, y: bottom } });
    }
    if (!tiles.has(tileKey({ col, row: row + 1 }))) {
      edges.push({ from: { x: right, y: bottom }, to: { x: left, y: bottom } });
    }
    if (!tiles.has(tileKey({ col: col - 1, row }))) {
      edges.push({ from: { x: left, y: bottom }, to: { x: left, y: top } });
    }
  }
  const leaving = new Map<string, Edge[]>();
  for (const edge of edges) {
    leaving.set(pointKey(edge.from), [...(leaving.get(pointKey(edge.from)) ?? []), edge]);
  }
  const used = new Set<Edge>();
  const rings: Point[][] = [];
  for (const start of edges) {
    if (used.has(start)) {
      continue;
    }
    const ring: Point[] = [];
    for (let edge: Edge | undefined = start; edge && !used.has(edge);) {
      used.add(edge);
      ring.push(edge.from);
      const heading = { x: Math.sign(edge.to.x - edge.from.x), y: Math.sign(edge.to.y - edge.from.y) };
      // Where two tiles meet at a corner only, the ring turns right, back round the tile it is on.
      const turn = (next: Edge) => {
        const way = { x: Math.sign(next.to.x - next.from.x), y: Math.sign(next.to.y - next.from.y) };
        return heading.x * way.y - heading.y * way.x;
      };
      edge = (leaving.get(pointKey(edge.to)) ?? [])
        .filter((next) => !used.has(next))
        .sort((left, right) => turn(right) - turn(left))[0];
    }
    rings.push(corners(ring));
  }
  return rings.sort((left, right) => ringArea(right) - ringArea(left))[0] ?? [];
};

/** The convex hull of `points`, clockwise on screen (Andrew's monotone chain). */
const convexHull = (points: readonly Point[]): Point[] => {
  const sorted = [...points].sort((left, right) => left.x - right.x || left.y - right.y);
  const cross = (origin: Point, a: Point, b: Point) =>
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  const chain = (source: readonly Point[]) => {
    const kept: Point[] = [];
    for (const point of source) {
      while (kept.length >= 2 && cross(kept[kept.length - 2], kept[kept.length - 1], point) <= 0) {
        kept.pop();
      }
      kept.push(point);
    }
    return kept.slice(0, -1);
  };
  return [...chain(sorted), ...chain([...sorted].reverse())];
};

const grown = (bounds: Bounds, margin: number): Bounds => ({
  x: bounds.x - margin,
  y: bounds.y - margin,
  width: bounds.width + 2 * margin,
  height: bounds.height + 2 * margin,
});

const boundsCorners = ({ x, y, width, height }: Bounds): Point[] => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
];

const boundsOf = (points: readonly Point[]): Bounds => {
  const [left, right] = [Math.min(...points.map(({ x }) => x)), Math.max(...points.map(({ x }) => x))];
  const [top, bottom] = [Math.min(...points.map(({ y }) => y)), Math.max(...points.map(({ y }) => y))];
  return { x: left, y: top, width: right - left, height: bottom - top };
};

/**
 * A hull's border as the corners of a closed ring in scene coordinates; undefined while nothing is inside it. On a
 * lattice it follows the hull's tiles; off one, or where none of its nodes keeps to the lattice, it stands
 * `HULL_MARGIN` off the nodes directly inside it (a hull inside it counting by its own frame).
 */
export const hullOutline = (nodes: readonly Node[], hull: HullNode, lattice?: LatticeSpec): Point[] | undefined => {
  if (lattice) {
    const tiles = hullTiles(nodes, hull, lattice);
    if (tiles.size > 0) {
      return tilesOutline(tiles, lattice);
    }
  }
  const frames = nodes.filter((node) => node.parent === hull.id && node.id !== hull.id).map(nodeBounds);
  if (frames.length === 0) {
    return undefined;
  }
  const points = frames.flatMap((frame) => boundsCorners(grown(frame, HULL_MARGIN)));
  return hull.shape === 'box' ? boundsCorners(boundsOf(points)) : convexHull(points);
};

const samePoints = (left: readonly Point[] | undefined, right: readonly Point[]): boolean =>
  left !== undefined &&
  left.length === right.length &&
  left.every((point, index) => point.x === right[index].x && point.y === right[index].y);

/**
 * The scene with every hull's frame and border set from the nodes inside it, innermost first so a hull is fitted
 * round the hulls inside it as they are drawn. A hull already fitted is returned as it is, and so is a scene with no
 * hull to fit.
 */
export const fitHulls = (scene: RenderList2D, lattice?: LatticeSpec): RenderList2D => {
  const hulls = Object.values(scene.nodes).filter(isHullNode);
  if (hulls.length === 0) {
    return scene;
  }
  const nodes: Record<string, Node> = { ...scene.nodes };
  let changed = false;
  for (const hull of [...hulls].sort((left, right) => depthOf(nodes, right) - depthOf(nodes, left))) {
    const outline = hullOutline(Object.values(nodes), hull, lattice);
    if (!outline || outline.length < 3) {
      continue;
    }
    const bounds = boundsOf(outline);
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const size = { width: bounds.width, height: bounds.height };
    const points = outline.map(({ x, y }) => ({
      x: size.width === 0 ? 0 : (x - bounds.x) / size.width,
      y: size.height === 0 ? 0 : (y - bounds.y) / size.height,
    }));
    const fitted =
      hull.center.x === center.x &&
      hull.center.y === center.y &&
      hull.size.width === size.width &&
      hull.size.height === size.height &&
      samePoints(hull.points, points);
    if (!fitted) {
      const next: HullNode = { ...hull, center, size, points };
      nodes[hull.id] = next;
      changed = true;
    }
  }
  return changed ? { ...scene, nodes } : scene;
};

/** Every hull's reach on a lattice: its tiles, and its border as the walls a gutter route answers to. */
export const hullRegions = (nodes: readonly Node[], spec: LatticeSpec): HullRegion[] =>
  nodes.filter(isHullNode).flatMap((hull) => {
    const tiles = hullTiles(nodes, hull, spec);
    const ring = tiles.size === 0 ? [] : tilesOutline(tiles, spec);
    return ring.length < 3
      ? []
      : [{ id: hull.id, tiles, walls: ring.map((from, index) => ({ from, to: ring[(index + 1) % ring.length] })) }];
  });

/**
 * The walls a route between two lattice nodes answers to: a hull holding both, or neither, is closed to it, so the
 * route stays inside the one and goes round the other; a hull holding one of them it crosses, once, to reach it.
 * A node is inside a hull whose tiles it stands on, whatever it names as its parent, since the border is where it is.
 */
export const routeWalls = (
  regions: readonly HullRegion[],
  spec: LatticeSpec,
  source: Node,
  target: Node,
): HullWalls | undefined => {
  if (regions.length === 0) {
    return undefined;
  }
  const [from, to] = [tileOfNode(source, spec), tileOfNode(target, spec)];
  const open = regions.filter((region) => region.tiles.has(from) !== region.tiles.has(to));
  return {
    borders: regions.flatMap((region) => region.walls),
    closed: regions.filter((region) => !open.includes(region)).flatMap((region) => region.walls),
    open: open.flatMap((region) => region.walls),
    least: open.length,
  };
};

export type EncloseOptions = {
  lattice?: LatticeSpec;
  /** Unset, `perimeter`. */
  shape?: HullShape;
};

/**
 * The scene with a new hull `id` round the nodes `ids`, drawn under everything so a press on a node inside it reaches
 * the node. Where the nodes were all inside one hull the new one goes inside it too, so the hierarchy nests; undefined
 * when none of `ids` is a node of the scene, or `id` is taken.
 */
export const enclose = (
  scene: RenderList2D,
  ids: readonly string[],
  id: string,
  { lattice, shape }: EncloseOptions = {},
): RenderList2D | undefined => {
  const members = ids.flatMap((member) => scene.nodes[member] ?? []);
  if (members.length === 0 || scene.nodes[id] !== undefined || scene.links[id] !== undefined) {
    return undefined;
  }
  const [lowest] = sortByZ([...Object.values(scene.nodes), ...Object.values(scene.links)]);
  const outers = new Set(members.map((member) => member.parent));
  const [outer] = outers.size === 1 ? [...outers] : [];
  const bounds = boundsOf(members.flatMap((member) => boundsCorners(nodeBounds(member))));
  const hull: HullNode = {
    ...createNode({
      type: 'hull',
      id,
      z: between(undefined, lowest?.z),
      center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      size: { width: bounds.width, height: bounds.height },
    }),
    type: 'hull',
    style: HULL_STYLE,
    ...(shape ? { shape } : {}),
    ...(outer !== undefined && scene.nodes[outer] && isHullNode(scene.nodes[outer]) ? { parent: outer } : {}),
  };
  const inside = Object.fromEntries(members.map((member) => [member.id, { ...member, parent: id }]));
  return fitHulls({ ...scene, nodes: { ...scene.nodes, ...inside, [id]: hull } }, lattice);
};
