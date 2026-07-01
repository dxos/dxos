//
// Copyright 2026 DXOS.org
//

import { type LayoutEdge, type LayoutNode } from '../types';

/**
 * Hit-test result handed to tools when locating an entity under a pointer.
 */
export type EntityHit = { kind: 'node'; node: LayoutNode } | { kind: 'edge'; edge: LayoutEdge } | undefined;

/**
 * Engine surface a Tool reads from.
 */
export interface ToolHost {
  hitTest(screenX: number, screenY: number): EntityHit;
  emitFrame(): void;
}

/**
 * Cross-cutting gesture FSM. Attached to the engine; receives DOM pointer events.
 */
export interface Tool {
  readonly id: string;
  attach(host: ToolHost, target: EventTarget): () => void;
}
