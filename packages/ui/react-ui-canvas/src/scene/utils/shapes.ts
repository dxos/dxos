//
// Copyright 2026 DXOS.org
//

//
// Pure geometry of the node and link types (§4): what each type's properties mean as a frame, how a
// resize writes back, and the default instance a tool creates. Rendering lives in the registry.
//

import {
  type Bounds,
  type Endpoint,
  type Link,
  type LinkType,
  type Node,
  type NodeType,
  type Point,
  type Size,
} from '../model/types.ts';

/** Axis-aligned frame of a node: the box for sized types, the radii for an ellipse. */
export const nodeBounds = (node: Node): Bounds => {
  if (node.type === 'ellipse') {
    return { x: node.center.x - node.rx, y: node.center.y - node.ry, width: 2 * node.rx, height: 2 * node.ry };
  }
  return {
    x: node.center.x - node.size.width / 2,
    y: node.center.y - node.size.height / 2,
    width: node.size.width,
    height: node.size.height,
  };
};

export const nodeSize = (node: Node): Size => {
  const { width, height } = nodeBounds(node);
  return { width, height };
};

/** The node re-framed to `bounds`; the type decides which properties carry the size. */
export const resizeNode = <N extends Node>(node: N, bounds: Bounds): N => {
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  if (node.type === 'ellipse') {
    return { ...node, center, rx: bounds.width / 2, ry: bounds.height / 2 };
  }
  return { ...node, center, size: { width: bounds.width, height: bounds.height } };
};

export const DEFAULT_SIZES: Record<NodeType, Size> = {
  rect: { width: 256, height: 128 },
  ellipse: { width: 256, height: 128 },
  class: { width: 256, height: 192 },
  text: { width: 256, height: 128 },
  scene: { width: 512, height: 320 },
};

export type CreateNodeProps = {
  type: NodeType;
  id: string;
  z: string;
  center: Point;
  size?: Size;
  /** A portal's child scene id. */
  scene?: string;
};

/** A new node of `type` with its type's default content. */
export const createNode = ({ type, id, z, center, size = DEFAULT_SIZES[type], scene }: CreateNodeProps): Node => {
  switch (type) {
    case 'rect':
      return { type, id, z, center, size, label: 'Untitled' };
    case 'ellipse':
      return { type, id, z, center, rx: size.width / 2, ry: size.height / 2, label: 'Untitled' };
    case 'class':
      return { type, id, z, center, size, name: 'Class', attributes: ['id: string'], methods: ['save(): void'] };
    case 'text':
      return { type, id, z, center, size, text: 'Text' };
    case 'scene':
      return { type, id, z, center, size, scene: scene ?? id };
  }
};

/** The node's display text, in the field its type uses for it. */
export const withLabel = <N extends Node>(node: N, label: string): N => {
  switch (node.type) {
    case 'rect':
    case 'ellipse':
      return { ...node, label };
    case 'class':
      return { ...node, name: label };
    case 'text':
      return { ...node, text: label };
    case 'scene':
      return node;
  }
};

export type CreateLinkProps = {
  type: LinkType;
  id: string;
  z: string;
  source: Endpoint;
  target: Endpoint;
  /** Where a new spline gets its first control point; ignored by the other types. */
  midpoint?: Point;
};

/** A new link of `type`; a spline starts with one control point so it is editable at once. */
export const createLink = ({ type, id, z, source, target, midpoint }: CreateLinkProps): Link => {
  switch (type) {
    case 'line':
    case 'curve':
      return { type, id, z, source, target };
    case 'spline':
      return { type, id, z, source, target, points: midpoint ? [midpoint] : [] };
  }
};
