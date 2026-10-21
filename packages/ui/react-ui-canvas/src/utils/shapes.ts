//
// Copyright 2026 DXOS.org
//

//
// Pure geometry of the node and link types (§4): every node's frame is its `size` centred on `center`,
// so the engine needs no registry to place, hit or route any type; the built-in types' defaults and
// display text live here too. Rendering lives in the registry.
//

import {
  type Bounds,
  type BuiltinNode,
  type BuiltinNodeType,
  DEFAULT_GRID,
  type Endpoint,
  type Link,
  type LinkEnds,
  type LinkType,
  type LinkValues,
  MAJOR_GRID_RATIO,
  type Node,
  type Point,
  type Size,
} from '../model/index.ts';
import { type PartField } from './parts.ts';
import { DEFAULT_POLYLINE_POINTS } from './polyline.ts';
import { DEFAULT_CLOUD_BUMPS, DEFAULT_POLYGON_SIDES } from './silhouette.ts';

/** Axis-aligned frame of a node: its size centred on its centre. */
export const nodeBounds = (node: Node): Bounds => ({
  x: node.center.x - node.size.width / 2,
  y: node.center.y - node.size.height / 2,
  width: node.size.width,
  height: node.size.height,
});

export const nodeSize = (node: Node): Size => node.size;

/** The node re-framed to `bounds`. */
export const resizeNode = <N extends Node>(node: N, bounds: Bounds): N => ({
  ...node,
  center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
  size: { width: bounds.width, height: bounds.height },
});

/** Scene px of one nominal unit (a major grid cell) at the default grid. */
export const DEFAULT_CELL = DEFAULT_GRID * MAJOR_GRID_RATIO;

/** A nominal size (in major grid cells) in scene px, for a drawing whose major cell is `cell` px. */
export const nominalSize = (size: Size, cell: number = DEFAULT_CELL): Size => ({
  width: size.width * cell,
  height: size.height * cell,
});

/**
 * The built-in types' sizes when created, in nominal units: one unit is the drawing's major grid cell, so a
 * new shape scales with the drawing's grid.
 */
export const NOMINAL_SIZES: Record<BuiltinNodeType, Size> = {
  rect: { width: 2, height: 1 },
  ellipse: { width: 2, height: 2 },
  cloud: { width: 3, height: 2 },
  polygon: { width: 2, height: 2 },
  polyline: { width: 2, height: 2 },
  note: { width: 4, height: 2 },
  view: { width: 4, height: 2 },
  instance: { width: 4, height: 2 },
  path: { width: 2, height: 2 },
  generator: { width: 4, height: 4 },
  diagram: { width: 2, height: 1 },
};

/** The built-in types' sizes in scene px, for fixtures and imports, whose layouts are written against them. */
export const DEFAULT_SIZES: Record<BuiltinNodeType, Size> = {
  rect: { width: 256, height: 256 },
  ellipse: { width: 256, height: 256 },
  cloud: { width: 384, height: 256 },
  polygon: { width: 256, height: 256 },
  polyline: { width: 256, height: 256 },
  note: { width: 256, height: 128 },
  view: { width: 512, height: 256 },
  instance: { width: 512, height: 256 },
  path: { width: 256, height: 256 },
  generator: { width: 512, height: 512 },
  diagram: { width: 256, height: 128 },
};

/** The bounding box a new basic shape gets at the default grid. */
export const DEFAULT_SHAPE_SIZE: Size = DEFAULT_SIZES.rect;

export type CreateNodeProps = {
  type: BuiltinNodeType;
  id: string;
  z: string;
  center: Point;
  size?: Size;
  /** A frame's child scene id, or an instance's composite. */
  scene?: string;
};

/** A new built-in node of `type` with its type's default content; a host type creates through its `NodeDef`. */
export const createNode = ({
  type,
  id,
  z,
  center,
  size = DEFAULT_SIZES[type],
  scene,
}: CreateNodeProps): BuiltinNode => {
  switch (type) {
    // A new box carries no label: a placeholder would have to be cleared before a real one is typed.
    case 'rect':
      return { type, id, z, center, size };
    case 'ellipse':
      return { type, id, z, center, size };
    // The count is set, so the panel shows the shape's own value rather than an empty field.
    case 'cloud':
      return { type, id, z, center, size, params: { bumps: DEFAULT_CLOUD_BUMPS } };
    case 'polygon':
      return { type, id, z, center, size, params: { sides: DEFAULT_POLYGON_SIDES } };
    case 'polyline':
      return { type, id, z, center, size, points: [...DEFAULT_POLYLINE_POINTS] };
    case 'note':
      return { type, id, z, center, size, text: 'Note' };
    case 'view':
      return { type, id, z, center, size, scene: scene ?? id };
    case 'instance':
      return { type, id, z, center, size, composite: scene ?? '' };
    case 'generator':
      return { type, id, z, center, size, generator: scene ?? '', params: {} };
    case 'diagram':
      // The element's geometry is the frame's, whatever the element says.
      return { type, id, z, center, size, element: { kind: 'rect', id, x: 0, y: 0, w: size.width, h: size.height } };
    case 'path':
      // A diamond until the path is set.
      return {
        type,
        id,
        z,
        center,
        size,
        d: 'M 50 0 L 100 50 L 50 100 L 0 50 Z',
        viewBox: { x: 0, y: 0, width: 100, height: 100 },
      };
  }
};

/** What a shape copy keeps of its own (the fresh node's) rather than the source's: identity, place and child scene. */
const OWN_FIELDS = new Set(['id', 'type', 'z', 'center', 'scene']);

/**
 * A new shape like `source` (its size, look and ports) built on `fresh`, the type's own new node at the
 * new place: it keeps its own identity and child scene, and the type's text rather than the source's.
 */
export const cloneShape = (source: Node, fresh: Node, parts: readonly PartField[] = []): Node => {
  const text = new Set(parts.map(({ field }) => field));
  return {
    ...fresh,
    ...Object.fromEntries(Object.entries(source).filter(([key]) => !OWN_FIELDS.has(key) && !text.has(key))),
  };
};

export type CreateLinkProps = {
  type: LinkType;
  id: string;
  z: string;
  source: Endpoint;
  target: Endpoint;
  /** Where a new spline gets its first control point; ignored by the other types. */
  midpoint?: Point;
  ends?: LinkEnds;
};

/** A new link of `type`; a spline starts with one control point so it is editable at once. */
export const createLink = ({ type, id, z, source, target, midpoint, ends }: CreateLinkProps): Link => {
  const base = { id, z, source, target, ...(ends ? { ends } : {}) };
  switch (type) {
    case 'line':
    case 'curve':
    case 'smart':
      return { type, ...base };
    case 'spline':
      return { type, ...base, points: midpoint ? [midpoint] : [] };
  }
};

/**
 * The `update` values that reverse a link: source and target swap while the markers stay at the start and
 * end, so an arrow comes to point the other way; a spline's control points run the other way, so the drawn
 * path keeps its shape.
 */
export const flipLink = (link: Link): LinkValues => ({
  source: link.target,
  target: link.source,
  ...(link.type === 'spline' ? { points: [...link.points].reverse() } : {}),
});

/** A fresh element or scene id: `prefix` and a random suffix. */
export const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
