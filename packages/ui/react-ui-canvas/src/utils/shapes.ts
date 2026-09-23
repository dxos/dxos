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
  type Endpoint,
  type Link,
  type LinkEnds,
  type LinkType,
  type Node,
  type Point,
  type Size,
  isClassNode,
  isEllipseNode,
  isNoteNode,
  isRectNode,
} from '../model/types.ts';

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

export const DEFAULT_SIZES: Record<BuiltinNodeType, Size> = {
  rect: { width: 256, height: 128 },
  ellipse: { width: 256, height: 128 },
  class: { width: 256, height: 192 },
  note: { width: 256, height: 128 },
  scene: { width: 512, height: 320 },
};

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
    case 'class':
      return { type, id, z, center, size, name: 'Class', attributes: ['id: string'], methods: ['save(): void'] };
    case 'note':
      return { type, id, z, center, size, text: 'Note' };
    case 'scene':
      return { type, id, z, center, size, scene: scene ?? id };
  }
};

/** The node's display text, in the field its type uses for it; a type without one is returned as is. */
export const withLabel = <N extends Node>(node: N, label: string): N => {
  if (isRectNode(node) || isEllipseNode(node)) {
    return { ...node, label };
  }
  if (isClassNode(node)) {
    return { ...node, name: label };
  }
  if (isNoteNode(node)) {
    return { ...node, text: label };
  }
  return node;
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
