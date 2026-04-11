//
// Copyright 2026 DXOS.org
//

import { type Mesh, PointerEventTypes, Vector3, type PointerInfo } from '@babylonjs/core';
import type { Manifold } from 'manifold-3d';

import { Obj } from '@dxos/echo';

import { applyExtrusion, serializeManifold, updateMeshFromManifold } from '../../engine';
import { type Tool } from '../tool';
import { type ToolContext } from '../tool-context';
import { selectFace } from './select-tool';

/** Throttle interval for pointer move updates (ms). */
const MOVE_THROTTLE_MS = 30;

/** Grid snap size (matches GRID_STEP in scene-manager). */
const SNAP_SIZE = 1;

/** Snaps a value to the nearest grid increment. */
const snapToGrid = (value: number): number => Math.round(value / SNAP_SIZE) * SNAP_SIZE;

/** Dot product of a Vector3 and a plain {x,y,z} vector. */
const dotVec3 = (a: Vector3, b: Vector3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** State tracked during an active extrude drag. */
type ExtrudeState = {
  /** ECHO object id being extruded. */
  objectId: string;
  /** Babylon mesh being manipulated. */
  mesh: Mesh;
  /** Face normal in world space. */
  normal: { x: number; y: number; z: number };
  /** Selected face index. */
  faceId: number;
  /** A point on the face plane (anchor for ray-normal intersection). */
  facePoint: Vector3;
  /** Normal as a Babylon Vector3. */
  normalVec: Vector3;
  /** T parameter along the normal line at drag start. */
  startT: number;
  /** Manifold solid at the start of this extrusion (cloned). */
  baseSolid: Manifold;
  /** Timestamp of last move update (for throttling). */
  lastMoveTime: number;
};

/**
 * Computes the closest point on the normal line to a mouse ray.
 * Returns the signed distance (t parameter) along the normal from the face point.
 *
 * Normal line: P = facePoint + t * normal
 * Mouse ray:   Q = rayOrigin + s * rayDir
 *
 * Finds t where the two lines are closest (line-line closest approach).
 */
const projectRayOntoNormal = (
  facePoint: Vector3,
  normalVec: Vector3,
  ctx: ToolContext,
  event: PointerEvent,
): number => {
  const ray = ctx.scene.createPickingRay(event.clientX, event.clientY, null, ctx.camera);
  const rayDir = ray.direction;
  const rayOrigin = ray.origin;

  // Vector from facePoint to rayOrigin.
  const w = rayOrigin.subtract(facePoint);

  const a = Vector3.Dot(normalVec, normalVec); // Always 1 for unit normal.
  const b = Vector3.Dot(normalVec, rayDir);
  const c = Vector3.Dot(rayDir, rayDir); // Always 1 for unit ray.
  const d = Vector3.Dot(normalVec, w);
  const e = Vector3.Dot(rayDir, w);

  const denom = a * c - b * b;
  if (Math.abs(denom) < 1e-10) {
    // Lines are parallel — return 0.
    return 0;
  }

  // t parameter on the normal line at the closest point.
  return (b * e - c * d) / denom;
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

    // If no face is selected, pick one (without starting extrusion).
    if (ctx.selection?.type !== 'face') {
      return selectFace(ctx, info);
    }

    const { objectId, mesh, normal, faceId } = ctx.selection;

    // Get the current runtime solid for this object.
    const currentSolid = ctx.solids.get(objectId);
    if (!currentSolid) {
      return false;
    }

    const event = info.event as PointerEvent;

    // Compute face point from the picked point or face centroid.
    const pickedPoint = info.pickInfo?.pickedPoint;
    const facePoint = pickedPoint ? pickedPoint.clone() : mesh.position.clone();
    const normalVec = new Vector3(normal.x, normal.y, normal.z);

    // Compute the initial t parameter (where the drag starts on the normal line).
    const startT = projectRayOntoNormal(facePoint, normalVec, ctx, event);

    // Hide selection highlight during extrusion (geometry changes invalidate it).
    if (ctx.selection?.highlightMesh) {
      ctx.selection.highlightMesh.setEnabled(false);
    }

    // Clone the solid so we can rebuild from base during drag.
    const { Manifold } = ctx.manifold;
    const baseSolid = Manifold.union(currentSolid, currentSolid);

    this._state = {
      objectId,
      mesh,
      normal,
      faceId,
      facePoint,
      normalVec,
      startT,
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

    // Ray-cast from the mouse position and find where it's closest to the face normal line.
    // The extrusion distance is the delta along the normal from the drag start point.
    const currentT = projectRayOntoNormal(this._state.facePoint, this._state.normalVec, ctx, event);
    let distance = -(currentT - this._state.startT);

    // Snap so the resulting face lands on a global grid line.
    if (event.shiftKey) {
      const facePos = dotVec3(this._state.facePoint, this._state.normalVec);
      distance = snapToGrid(facePos + distance) - facePos;
    }

    const t0 = performance.now();
    const extruded = applyExtrusion(
      ctx.manifold.Manifold,
      this._state.baseSolid,
      this._state.faceId,
      this._state.normal,
      distance,
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
      snap: event.shiftKey ? 'on' : 'off',
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
    const currentT = projectRayOntoNormal(this._state.facePoint, this._state.normalVec, ctx, event);
    let distance = -(currentT - this._state.startT);
    if (event.shiftKey) {
      const facePos = dotVec3(this._state.facePoint, this._state.normalVec);
      distance = snapToGrid(facePos + distance) - facePos;
    }

    const finalSolid = applyExtrusion(
      ctx.manifold.Manifold,
      this._state.baseSolid,
      this._state.faceId,
      this._state.normal,
      distance,
    );

    // Replace the runtime solid for this object.
    const oldSolid = ctx.solids.get(this._state.objectId);
    oldSolid?.delete();
    ctx.solids.set(this._state.objectId, finalSolid);

    // Clean up the cloned base solid.
    this._state.baseSolid.delete();

    // Clear face selection (geometry changed, face ids invalid) but keep object selected.
    ctx.setSelection({ type: 'object', objectId: this._state.objectId, mesh: this._state.mesh, highlightMesh: null });

    // Persist the extruded geometry to ECHO.
    const modelObject = ctx.getObject(this._state.objectId);
    if (modelObject) {
      const meshData = serializeManifold(finalSolid);
      Obj.change(modelObject, (obj) => {
        obj.primitive = undefined;
        obj.mesh = meshData;
      });
    }

    ctx.camera.attachControl(ctx.canvas, true);
    this._state = null;
    return true;
  }
}
