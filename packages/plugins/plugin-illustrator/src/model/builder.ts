//
// Copyright 2026 DXOS.org
//

//
// Renderer-neutral builder contract: each canvas variant (tldraw, excalidraw, …) implements
// `SketchBuilder` to compile the scene DSL onto its concrete records and derive the scene back
// from them. Implementations are contributed via `IllustratorCapabilities.VariantProvider`.
//

import { type Obj } from '@dxos/echo';

import type * as Scene from './scene';

/** A world object as derived from the canvas: placement is always resolved. */
export type ReadWorldObject = Scene.WorldObject & {
  origin: Scene.Point;
  scale: number;
};

export type ReadResult = {
  scene: { objects: ReadWorldObject[] };
  /** Shapes on the canvas not managed by the DSL (hand-drawn by users). */
  unmanaged: number;
};

export type ApplyResult = {
  /** Object ids created or modified. */
  upserted: string[];
  /** Shape records removed. */
  removed: number;
};

/**
 * Maps the scene DSL onto a renderer-specific canvas object.
 * Geometry is derived from the live canvas records — not a stored copy — so the model stays
 * coherent after users drag or resize shapes in the renderer's UI.
 */
export type SketchBuilder = {
  /** Derive the neutral scene from the canvas. */
  read: (canvas: Obj.Any) => ReadResult;
  /** Apply a batch of edit commands atomically (implementations wrap their own `Obj.update`). */
  apply: (canvas: Obj.Any, commands: readonly Scene.Command[]) => ApplyResult;
};
