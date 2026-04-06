//
// Copyright 2026 DXOS.org
//

import { type Model } from '../types';

import { type ToolContext } from './tool-context';

/** Editor-side state passed to actions (React state the action cannot access directly). */
export type EditorState = {
  /** Ordered list of currently selected object IDs. */
  selectedObjectIds: string[];
  /** Currently selected template for new objects. */
  selectedTemplate: Model.ObjectTemplate;
  /** Current hue for new objects. */
  hue: string;
};

/** Result returned by an action to the editor for React state updates. */
export type ActionResult = {
  /** Object IDs to select after the action completes. */
  selectObjectIds?: string[];
};

/** Lifecycle interface for an action handler. */
export interface ActionHandler {
  /** Unique action identifier (matches toolbar action id). */
  readonly id: string;
  /** Execute the action. Returns result for the editor to apply, or undefined if no-op. */
  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined;
}

/**
 * Disposes a scene object's Babylon mesh and Manifold solid from the runtime maps.
 * Does NOT modify ECHO — callers must handle ECHO mutations separately.
 */
export const disposeSceneObject = (ctx: ToolContext, objectId: string): void => {
  const mesh = ctx.meshes.get(objectId);
  if (mesh) {
    mesh.dispose();
    ctx.meshes.delete(objectId);
  }
  const solid = ctx.solids.get(objectId);
  if (solid) {
    solid.delete();
    ctx.solids.delete(objectId);
  }
};
