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
  type Node,
  type Point,
  type Size,
} from '../model/types.ts';
import { type PartField } from './parts.ts';

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

/** A nominal size (in grid units) in scene px, for a drawing whose grid is `cell` px. */
export const nominalSize = (size: Size, cell: number = DEFAULT_GRID): Size => ({
  width: size.width * cell,
  height: size.height * cell,
});

/**
 * The built-in types' sizes when created, in nominal units: one unit is the drawing's grid size, so a new
 * shape is as large as the grid. Rectangle and ellipse share one, so a new circle matches a new square.
 */
export const NOMINAL_SIZES: Record<BuiltinNodeType, Size> = {
  rect: { width: 1, height: 1 },
  ellipse: { width: 1, height: 1 },
  note: { width: 1, height: 1 },
  scene: { width: 2, height: 1 },
};

/** The built-in types' sizes in scene px, for fixtures and imports, whose layouts are written against them. */
export const DEFAULT_SIZES: Record<BuiltinNodeType, Size> = {
  rect: { width: 256, height: 256 },
  ellipse: { width: 256, height: 256 },
  note: { width: 256, height: 128 },
  scene: { width: 512, height: 256 },
};

/** The bounding box a new basic shape gets at the default grid. */
export const DEFAULT_SHAPE_SIZE: Size = DEFAULT_SIZES.rect;

export type CreateNodeProps = {
  type: BuiltinNodeType;
  id: string;
  z: string;
  center: Point;
  size?: Size;
  /** A portal's child scene id. */
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
    case 'note':
      return { type, id, z, center, size, text: 'Note' };
    case 'scene':
      return { type, id, z, center, size, scene: scene ?? id };
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
  directed?: boolean;
  ends?: LinkEnds;
};

/** A new link of `type`; a spline starts with one control point so it is editable at once. */
export const createLink = ({ type, id, z, source, target, midpoint, directed, ends }: CreateLinkProps): Link => {
  const base = { id, z, source, target, ...(directed ? { directed } : {}), ...(ends ? { ends } : {}) };
  switch (type) {
    case 'line':
    case 'curve':
    case 'smart':
      return { type, ...base };
    case 'spline':
      return { type, ...base, points: midpoint ? [midpoint] : [] };
  }
};
