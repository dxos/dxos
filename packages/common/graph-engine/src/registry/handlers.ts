//
// Copyright 2026 DXOS.org
//

import { type ReactNode } from 'react';

import { type DrawContext } from '../draw/draw-context';
import { type Path } from '../draw/path';
import { type EdgeRouter } from '../router/router';
import { type LayoutEdge, type LayoutNode, type Point, type Rect, type SemanticPointerEvent } from '../types';
import { type Viewport } from '../viewport';

export type LodScaling = 'fixed-pixel' | 'world' | 'hybrid';

export type LodLevel = {
  minScale: number;
  maxScale?: number;
  render: 'full' | 'compact' | 'dot';
};

export type NodeCapabilities = {
  draggable?: boolean;
  linkable?: boolean;
  selectable?: boolean;
  hoverable?: boolean;
  inspectable?: boolean;
};

export type EdgeCapabilities = {
  selectable?: boolean;
  hoverable?: boolean;
};

export type NodeIsland<NodeData = any> = {
  render(node: LayoutNode<NodeData>, viewport: Viewport, engineHandle: EngineHandle): ReactNode;
  anchor?: 'center' | 'top' | 'bottom' | { offset: Point };
  scaling?: LodScaling;
  passthrough?: boolean;
  show?: (viewport: Viewport) => boolean;
};

export type EdgeIsland<NodeData = any, EdgeData = any> = {
  render(edge: LayoutEdge<NodeData, EdgeData>, path: Path, viewport: Viewport, engineHandle: EngineHandle): ReactNode;
  anchor?: 'midpoint' | { t: number } | ((path: Path) => Point);
  scaling?: LodScaling;
  passthrough?: boolean;
  show?: (viewport: Viewport) => boolean;
};

/**
 * Minimal handle passed to handlers — avoids a circular dep with engine.ts.
 */
export type EngineHandle = {
  readonly viewport: Viewport;
  bringToFront(islandId: string): void;
};

export type NodeHandler<NodeData = any> = {
  draw(ctx: DrawContext, node: LayoutNode<NodeData>, viewport: Viewport): void;
  bounds(node: LayoutNode<NodeData>): Rect;
  hit(point: Point, node: LayoutNode<NodeData>): boolean;
  preferredRadius?: number | ((node: LayoutNode<NodeData>, children: number) => number);
  layoutWeight?: number;
  lod?: { scaling: LodScaling; levels?: LodLevel[] };
  capabilities?: NodeCapabilities;
  onPointer?(event: SemanticPointerEvent, node: LayoutNode<NodeData>, engineHandle: EngineHandle): void | 'veto';
  island?: NodeIsland<NodeData>;
};

export type EdgeRouterId = 'straight' | 'bezier' | 'orthogonal' | 'radial-arc';

export type EdgeHandler<NodeData = any, EdgeData = any> = {
  router: EdgeRouterId | EdgeRouter<NodeData, EdgeData>;
  draw(ctx: DrawContext, edge: LayoutEdge<NodeData, EdgeData>, path: Path, viewport: Viewport): void;
  hit(point: Point, edge: LayoutEdge<NodeData, EdgeData>, path: Path): boolean;
  bounds(edge: LayoutEdge<NodeData, EdgeData>, path: Path): Rect;
  lod?: { scaling: LodScaling; levels?: LodLevel[] };
  capabilities?: EdgeCapabilities;
  onPointer?(
    event: SemanticPointerEvent,
    edge: LayoutEdge<NodeData, EdgeData>,
    engineHandle: EngineHandle,
  ): void | 'veto';
  island?: EdgeIsland<NodeData, EdgeData>;
};
