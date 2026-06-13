//
// Copyright 2026 DXOS.org
//

export type Point = [number, number];

export type Size = { width: number; height: number };

export type Rect = { x: number; y: number; width: number; height: number };

export const rectContains = (r: Rect, [px, py]: Point): boolean =>
  px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;

/**
 * Layout-space node — projector output, renderer input.
 */
export type LayoutNode<NodeData = any> = {
  id: string;
  type?: string;
  data?: NodeData;
  x?: number;
  y?: number;
  r?: number;
  initialized?: boolean;
};

/**
 * Layout-space edge — references resolved `LayoutNode`s.
 */
export type LayoutEdge<NodeData = any, EdgeData = any> = {
  id: string;
  type?: string;
  data?: EdgeData;
  source: LayoutNode<NodeData>;
  target: LayoutNode<NodeData>;
};

export type LayoutGraph<NodeData = any, EdgeData = any> = {
  nodes: LayoutNode<NodeData>[];
  edges: LayoutEdge<NodeData, EdgeData>[];
};

/**
 * High-level semantic pointer event emitted by tools after gesture detection.
 */
export type SemanticPointerEvent =
  | { type: 'hover-enter'; entityId: string; native: PointerEvent }
  | { type: 'hover-leave'; entityId: string; native: PointerEvent }
  | { type: 'select'; entityId: string; additive: boolean; native: PointerEvent }
  | { type: 'click'; entityId: string; native: PointerEvent };
