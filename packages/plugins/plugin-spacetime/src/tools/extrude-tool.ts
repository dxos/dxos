//
// Copyright 2026 DXOS.org
//

import { Matrix, type Mesh, PointerEventTypes, Vector3, VertexBuffer, type PointerInfo } from '@babylonjs/core';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';

import { getFaceNormal, updateMeshFromManifold } from '../engine/mesh-converter';
import { type Model } from '../types';
import { type ToolContext } from './tool-context';
import { type Tool } from './tool';

/** Sensitivity factor converting pixel drag distance to extrude distance. */
const EXTRUDE_SENSITIVITY = 0.02;

/** State tracked during an active extrude drag. */
type ExtrudeState = {
  /** ECHO object id being extruded. */
  objectId: string;
  /** Babylon mesh being manipulated. */
  mesh: Mesh;
  /** Face normal in world space. */
  normal: { x: number; y: number; z: number };
  /** Normalized screen-space direction that maps to positive extrusion. */
  screenDir: { x: number; y: number };
  /** Pointer position at drag start. */
  startX: number;
  /** Pointer position at drag start. */
  startY: number;
  /** The Model.Object for this mesh. */
  modelObject: Model.Object;
};

/**
 * Computes a screen-space direction vector corresponding to a world-space normal.
 * Used to determine which mouse drag direction maps to positive extrusion.
 */
const computeScreenDir = (
  normal: { x: number; y: number; z: number },
  ctx: ToolContext,
): { x: number; y: number } => {
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

/**
 * Creates a Manifold solid from a Model.Object based on its primitive type and scale.
 */
const createSolidFromObject = (Manifold: ManifoldToplevel['Manifold'], obj: Model.Object): Manifold => {
  const size = [obj.scale.x * 2, obj.scale.y * 2, obj.scale.z * 2] as [number, number, number];
  let solid;
  switch (obj.primitive) {
    case 'sphere':
      solid = Manifold.sphere(size[0] / 2, 24);
      break;
    case 'cylinder':
      solid = Manifold.cylinder(size[1], size[0] / 2, size[0] / 2, 24);
      break;
    case 'torus':
      solid = Manifold.cylinder(size[1] * 0.5, size[0] / 2, size[0] / 2, 24);
      break;
    case 'cube':
    default:
      solid = Manifold.cube(size, true);
      break;
  }
  const translated = solid.translate([obj.position.x, obj.position.y, obj.position.z]);
  solid.delete();
  return translated;
};

/**
 * Applies extrusion to a solid by creating a slab along the given normal direction
 * and performing a boolean union (positive) or difference (negative).
 */
const applyExtrusion = (
  Manifold: ManifoldToplevel['Manifold'],
  baseSolid: Manifold,
  normal: { x: number; y: number; z: number },
  distance: number,
): Manifold => {
  if (distance === 0) {
    return baseSolid;
  }

  const absDist = Math.abs(distance);
  const sign = distance > 0 ? 1 : -1;
  const bbox = baseSolid.boundingBox();

  const anx = Math.abs(normal.x);
  const any = Math.abs(normal.y);
  const anz = Math.abs(normal.z);

  // Slab: full bounding box on tangent axes, absDist on normal axis.
  const slabW = anx > 0.5 ? absDist : bbox.max[0] - bbox.min[0];
  const slabH = any > 0.5 ? absDist : bbox.max[1] - bbox.min[1];
  const slabD = anz > 0.5 ? absDist : bbox.max[2] - bbox.min[2];
  const slab = Manifold.cube([slabW, slabH, slabD], true);

  // Position slab at the face.
  const cx =
    (bbox.min[0] + bbox.max[0]) / 2 +
    normal.x * ((anx > 0.5 ? (bbox.max[0] - bbox.min[0]) / 2 : 0) + (sign * absDist) / 2);
  const cy =
    (bbox.min[1] + bbox.max[1]) / 2 +
    normal.y * ((any > 0.5 ? (bbox.max[1] - bbox.min[1]) / 2 : 0) + (sign * absDist) / 2);
  const cz =
    (bbox.min[2] + bbox.max[2]) / 2 +
    normal.z * ((anz > 0.5 ? (bbox.max[2] - bbox.min[2]) / 2 : 0) + (sign * absDist) / 2);
  const translated = slab.translate([cx, cy, cz]);
  slab.delete();

  const result = sign > 0 ? Manifold.union(baseSolid, translated) : Manifold.difference(baseSolid, translated);
  translated.delete();
  return result;
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

    const pickedMesh = info.pickInfo?.pickedMesh;
    if (!info.pickInfo?.hit || !pickedMesh) {
      return false;
    }

    // Find the ECHO object id for the picked mesh.
    let objectId: string | undefined;
    for (const [id, mesh] of ctx.meshes) {
      if (mesh === pickedMesh) {
        objectId = id;
        break;
      }
    }

    if (!objectId) {
      return false;
    }

    const modelObject = ctx.getObject(objectId);
    if (!modelObject) {
      return false;
    }

    const mesh = pickedMesh as Mesh;

    // Determine the face that was picked and compute its normal.
    const faceId = info.pickInfo.faceId;
    if (faceId === undefined || faceId < 0) {
      return false;
    }

    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    if (!positions || !indices) {
      return false;
    }

    const normal = getFaceNormal(faceId, positions, indices);
    const screenDir = computeScreenDir(normal, ctx);
    const event = info.event as PointerEvent;

    this._state = {
      objectId,
      mesh,
      normal,
      screenDir,
      startX: event.clientX,
      startY: event.clientY,
      modelObject,
    };

    ctx.camera.detachControl();
    return true;
  }

  onPointerMove(ctx: ToolContext, info: PointerInfo): boolean {
    if (!this._state) {
      return false;
    }

    const event = info.event as PointerEvent;
    const dx = event.clientX - this._state.startX;
    const dy = event.clientY - this._state.startY;

    // Project mouse delta onto the screen-space normal direction.
    const projection = dx * this._state.screenDir.x + dy * this._state.screenDir.y;
    const distance = projection * EXTRUDE_SENSITIVITY;

    // Rebuild the solid with extrusion applied.
    const { Manifold } = ctx.manifold;
    const baseSolid = createSolidFromObject(Manifold, this._state.modelObject);
    const extruded = applyExtrusion(Manifold, baseSolid, this._state.normal, distance);
    baseSolid.delete();

    // Update the Babylon mesh in-place.
    updateMeshFromManifold(extruded, this._state.mesh);
    extruded.delete();

    return true;
  }

  onPointerUp(ctx: ToolContext, _info: PointerInfo): boolean {
    if (!this._state) {
      return false;
    }

    // TODO(burdon): Serialize geometry to Model.Object once geometry field is added.
    // The mesh already shows the final extruded state from the last pointer move.
    // For now we skip the ECHO commit since there is no geometry field on Model.Object.

    ctx.camera.attachControl(ctx.canvas, true);
    this._state = null;
    return true;
  }
}
