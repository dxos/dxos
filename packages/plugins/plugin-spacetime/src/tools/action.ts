//
// Copyright 2026 DXOS.org
//

import { type ToolContext } from './tool-context';

/** Lifecycle interface for an action handler. */
export interface ActionHandler {
  /** Unique action identifier (matches toolbar action id). */
  readonly id: string;
  /** Execute the action. Reads/writes state via ctx.editorState. */
  execute(ctx: ToolContext): void;
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
