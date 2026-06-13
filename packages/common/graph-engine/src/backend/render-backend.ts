//
// Copyright 2026 DXOS.org
//

import { type DrawContext } from '../draw/draw-context';
import { type LayoutGraph } from '../types';
import { type Viewport } from '../viewport';

export type RenderFrame<NodeData = any, EdgeData = any> = {
  layout: LayoutGraph<NodeData, EdgeData>;
  viewport: Viewport;
};

/**
 * Backend driver. Concrete impls own the DOM element they render into.
 */
export interface RenderBackend {
  /** Resize the underlying surface. */
  resize(width: number, height: number, dpr: number): void;
  /** Returns the DrawContext for the current frame. */
  begin(): DrawContext;
  /** Finalize the frame (flush, swap, etc.). */
  end(): void;
}
