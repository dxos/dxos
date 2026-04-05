//
// Copyright 2026 DXOS.org
//

import { Matrix, type Mesh, PointerEventTypes, Vector3, VertexBuffer, type PointerInfo } from '@babylonjs/core';
import type { Manifold } from 'manifold-3d';

import { applyExtrusion, updateMeshFromManifold } from '../../engine';
import { type ToolContext } from '../tool-context';
import { type Tool } from '../tool';

/** Sensitivity factor converting pixel drag distance to extrude distance. */
const EXTRUDE_SENSITIVITY = 0.02;

/** Throttle interval for pointer move updates (ms). */
const MOVE_THROTTLE_MS = 30;

/** State tracked during an active extrude drag. */
type ExtrudeState = {
  /** ECHO object id being extruded. */
  objectId: string;
  /** Babylon mesh being manipulated. */
  mesh: Mesh;
  /** Face normal in world space. */
  normal: { x: number; y: number; z: number };
  /** Selected face index (for CrossSection extraction). */
  faceId: number;
  /** Vertex positions snapshot at drag start. */
  positions: Float32Array | number[];
  /** Index buffer snapshot at drag start. */
  indices: Uint32Array | number[];
  /** Manifold face IDs for reliable coplanar face grouping after boolean ops. */
  faceIDs: Uint32Array;
  /** Normalized screen-space direction that maps to positive extrusion. */
  screenDir: { x: number; y: number };
  /** Pointer position at drag start. */
  startX: number;
  /** Pointer position at drag start. */
  startY: number;
  /** Manifold solid at the start of this extrusion (cloned). */
  baseSolid: Manifold;
  /** Timestamp of last move update (for throttling). */
  lastMoveTime: number;
};

/**
 * Computes a screen-space direction vector corresponding to a world-space normal.
 * Used to determine which mouse drag direction maps to positive extrusion.
 */
const computeScreenDir = (normal: { x: number; y: number; z: number }, ctx: ToolContext): { x: number; y: number } => {
  const viewProjection = ctx.scene.getTransformMatrix();
  const viewport = ctx.camera.viewport.toGlobal(ctx.canvas.clientWidth, ctx.canvas.clientHeight);
  const worldOrigin = Vector3.Project(Vector3.Zero(), Matrix.Identity(), viewProjection, viewport);
  const worldTip = Vector3.Project(
    new Vector3(normal.x, normal.y, normal.z),
    Matrix.Identity(),
    viewProjection,
    viewport,
  );
  const dx = worldTip.x - worldOrigin.x;
  const dy = worldTip.y - worldOrigin.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  return { x: len > 0 ? dx / len : 0, y: len > 0 ? dy / len : -1 };
};

/** Tool for extruding faces of mesh objects via click-drag. */
export class ExtrudeTool implements Tool {
  readonly id = 'extrude';

  private _state: ExtrudeState | null = null;

  activate(_ctx: ToolContext): void {}

  deactivate(ctx: ToolContext): void {
    if (this._state) {
      ctx.camera.attachControl(ctx.canvas, true);
      this._state = null;
    }
  }

  onPointerDown(ctx: ToolContext, info: PointerInfo): boolean {
    if (info.type !== PointerEventTypes.POINTERDOWN) {
      return false;
    }

    // NOTE: Guard against re-entry. A double-click fires two POINTERDOWN events in rapid
    // succession. Without this guard, the second would start a new extrusion while the first
    // is still active, leaking the cloned baseSolid from the first operation.
    if (this._state) {
      return true;
    }

    // Extrusion requires a face selection.
    if (ctx.selection?.type !== 'face') {
      return false;
    }

    const { objectId, mesh, normal, faceId } = ctx.selection;

    // Get the current runtime solid for this object.
    const currentSolid = ctx.solids.get(objectId);
    if (!currentSolid) {
      return false;
    }

    const screenDir = computeScreenDir(normal, ctx);
    const event = info.event as PointerEvent;

    // Hide selection highlight during extrusion (geometry changes invalidate it).
    if (ctx.selection?.highlightMesh) {
      ctx.selection.highlightMesh.setEnabled(false);
    }

    // Snapshot the mesh vertex data at drag start (geometry changes during drag).
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    if (!positions || !indices) {
      return false;
    }

    // Clone the solid so we can rebuild from base during drag.
    const { Manifold } = ctx.manifold;
    const baseSolid = Manifold.union(currentSolid, currentSolid);

    // Extract Manifold's face IDs for reliable coplanar face grouping.
    // After boolean operations, Manifold may split a logical face into multiple triangles
    // with seam edges — faceID correctly groups them where manual coplanarity checks fail.
    const manifoldMesh = currentSolid.getMesh();
    const faceIDs = manifoldMesh.faceID;

    this._state = {
      objectId,
      mesh,
      normal,
      faceId,
      positions: Float32Array.from(positions),
      indices: Uint32Array.from(indices as number[]),
      faceIDs: Uint32Array.from(faceIDs),
      screenDir,
      startX: event.clientX,
      startY: event.clientY,
      baseSolid,
      lastMoveTime: 0,
    };

    ctx.camera.detachControl();
    return true;
  }

  onPointerMove(ctx: ToolContext, info: PointerInfo): boolean {
    if (!this._state) {
      return false;
    }

    // Throttle CSG operations to prevent slowdown on complex geometry.
    const now = performance.now();
    if (now - this._state.lastMoveTime < MOVE_THROTTLE_MS) {
      return true;
    }
    this._state.lastMoveTime = now;

    const event = info.event as PointerEvent;
    const dx = event.clientX - this._state.startX;
    const dy = event.clientY - this._state.startY;

    // Project mouse delta onto the screen-space normal direction.
    const projection = dx * this._state.screenDir.x + dy * this._state.screenDir.y;
    const distance = projection * EXTRUDE_SENSITIVITY;

    // Apply extrusion using the face boundary polygon (CrossSection-based).
    const t0 = performance.now();
    const extruded = applyExtrusion(
      ctx.manifold,
      this._state.baseSolid,
      this._state.faceId,
      this._state.positions,
      this._state.indices,
      this._state.normal,
      distance,
      this._state.faceIDs,
    );
    const t1 = performance.now();

    // Update the Babylon mesh in-place.
    updateMeshFromManifold(extruded, this._state.mesh);
    const t2 = performance.now();

    const meshData = extruded.getMesh();
    ctx.setDebugStats({
      tris: meshData.numTri,
      verts: meshData.vertProperties.length / meshData.numProp,
      csg: `${(t1 - t0).toFixed(1)}ms`,
      mesh: `${(t2 - t1).toFixed(1)}ms`,
      dist: distance.toFixed(3),
    });

    extruded.delete();

    return true;
  }

  onPointerUp(ctx: ToolContext, info: PointerInfo): boolean {
    if (!this._state) {
      return false;
    }

    // Rebuild the final solid and store it as the new runtime state.
    const event = info.event as PointerEvent;
    const dx = event.clientX - this._state.startX;
    const dy = event.clientY - this._state.startY;
    const projection = dx * this._state.screenDir.x + dy * this._state.screenDir.y;
    const distance = projection * EXTRUDE_SENSITIVITY;

    const finalSolid = applyExtrusion(
      ctx.manifold,
      this._state.baseSolid,
      this._state.faceId,
      this._state.positions,
      this._state.indices,
      this._state.normal,
      distance,
      this._state.faceIDs,
    );

    // Replace the runtime solid for this object.
    const oldSolid = ctx.solids.get(this._state.objectId);
    oldSolid?.delete();
    ctx.solids.set(this._state.objectId, finalSolid);

    // Clean up the cloned base solid.
    this._state.baseSolid.delete();

    // Clear face selection (geometry changed, face ids invalid) but keep object selected.
    ctx.setSelection({ type: 'object', objectId: this._state.objectId, mesh: this._state.mesh, highlightMesh: null });

    // TODO(burdon): Serialize geometry to Model.Object once geometry field is added.

    ctx.camera.attachControl(ctx.canvas, true);
    this._state = null;
    return true;
  }
}
