//
// Copyright 2026 DXOS.org
//

import { type Mesh, Plane, PointerEventTypes, Vector3, type PointerInfo } from '@babylonjs/core';

import { Obj } from '@dxos/echo';

import { type ToolContext } from '../tool-context';
import { type Tool } from '../tool';

/** Grid snap size (matches GRID_STEP in scene-manager). */
const SNAP_SIZE = 1;

/** Snaps a value to the nearest grid increment. */
const snapToGrid = (value: number): number => Math.round(value / SNAP_SIZE) * SNAP_SIZE;

/** State tracked during an active drag operation. */
type DragState = {
  /** ECHO object id being dragged. */
  objectId: string;
  /** Babylon mesh being manipulated. */
  mesh: Mesh;
  /** Mesh position at start of drag. */
  startPosition: Vector3;
  /** World-space point where the pointer first hit the ground plane. */
  dragOrigin: Vector3;
  /** Horizontal plane for pointer projection (at the pick point's Y level). */
  plane: Plane;
};

/** Tool for dragging objects to translate their position. */
export class MoveTool implements Tool {
  readonly id = 'move';

  private _drag: DragState | null = null;

  activate(_ctx: ToolContext): void {}

  deactivate(ctx: ToolContext): void {
    if (this._drag) {
      ctx.camera.attachControl(ctx.canvas, true);
      this._drag = null;
    }
  }

  onPointerDown(ctx: ToolContext, info: PointerInfo): boolean {
    if (info.type !== PointerEventTypes.POINTERDOWN) {
      return false;
    }

    // NOTE: Guard against re-entry. Double-click fires two rapid POINTERDOWN events.
    // Without this guard, the second would overwrite _drag, losing the original start position.
    if (this._drag) {
      return true;
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

    const mesh = pickedMesh as Mesh;
    const startPosition = mesh.position.clone();
    const pickPoint = info.pickInfo.pickedPoint;
    if (!pickPoint) {
      return false;
    }

    // Project the initial pick point onto a horizontal plane at the object's Y level.
    // The drag origin is the projected point so movement is purely in the XZ plane.
    const plane = Plane.FromPositionAndNormal(new Vector3(0, startPosition.y, 0), Vector3.Up());

    // Ray-cast the initial click onto the drag plane to get a consistent drag origin.
    const startEvent = info.event as PointerEvent;
    const startRay = ctx.scene.createPickingRay(startEvent.clientX, startEvent.clientY, null, ctx.camera);
    const startDist = startRay.intersectsPlane(plane);
    if (startDist === null) {
      return false;
    }
    const dragOrigin = startRay.origin.add(startRay.direction.scale(startDist));

    this._drag = { objectId, mesh, startPosition, dragOrigin, plane };
    ctx.camera.detachControl();
    return true;
  }

  onPointerMove(ctx: ToolContext, info: PointerInfo): boolean {
    if (!this._drag) {
      return false;
    }

    const event = info.event as PointerEvent;
    const ray = ctx.scene.createPickingRay(event.clientX, event.clientY, null, ctx.camera);
    const distance = ray.intersectsPlane(this._drag.plane);
    if (distance === null) {
      return true;
    }

    const point = ray.origin.add(ray.direction.scale(distance));
    let delta = point.subtract(this._drag.dragOrigin);

    // Snap to grid when shift is held.
    if (event.shiftKey) {
      delta = new Vector3(snapToGrid(delta.x), snapToGrid(delta.y), snapToGrid(delta.z));
    }

    // Update visual position only (no ECHO write during drag).
    this._drag.mesh.position = this._drag.startPosition.add(delta);

    ctx.setDebugStats({
      x: this._drag.mesh.position.x.toFixed(2),
      y: this._drag.mesh.position.y.toFixed(2),
      z: this._drag.mesh.position.z.toFixed(2),
      snap: event.shiftKey ? 'on' : 'off',
    });

    return true;
  }

  onPointerUp(ctx: ToolContext, info: PointerInfo): boolean {
    if (!this._drag) {
      return false;
    }

    // Apply final snap if shift is held.
    const event = info.event as PointerEvent;
    if (event.shiftKey) {
      const pos = this._drag.mesh.position;
      this._drag.mesh.position = new Vector3(snapToGrid(pos.x), snapToGrid(pos.y), snapToGrid(pos.z));
    }

    const { objectId, mesh } = this._drag;
    const modelObject = ctx.getObject(objectId);
    if (modelObject) {
      // Commit final position to ECHO.
      Obj.change(modelObject, (obj) => {
        obj.position = {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
        };
      });
    }

    // Re-select the object to refresh the debug panel.
    ctx.setSelection({ type: 'object', objectId, mesh, highlightMesh: null });

    ctx.camera.attachControl(ctx.canvas, true);
    this._drag = null;
    return true;
  }
}
