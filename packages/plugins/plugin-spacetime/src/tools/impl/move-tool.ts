//
// Copyright 2026 DXOS.org
//

import { type Mesh, Plane, PointerEventTypes, Vector3, type PointerInfo } from '@babylonjs/core';

import { Obj } from '@dxos/echo';

import { type ToolContext } from '../tool-context';
import { type Tool } from '../tool';

/** State tracked during an active drag operation. */
type DragState = {
  /** ECHO object id being dragged. */
  objectId: string;
  /** Babylon mesh being manipulated. */
  mesh: Mesh;
  /** Mesh position at start of drag. */
  startPosition: Vector3;
  /** Point on the ground plane where drag began. */
  dragOrigin: Vector3;
  /** Horizontal plane at the object's Y level for projection. */
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
    const plane = Plane.FromPositionAndNormal(startPosition, Vector3.Up());

    // Compute the initial pick point on the ground plane.
    const pickPoint = info.pickInfo.pickedPoint;
    if (!pickPoint) {
      return false;
    }

    // Project pick point onto the horizontal plane at object's Y level.
    const dragOrigin = new Vector3(pickPoint.x, startPosition.y, pickPoint.z);

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
    const delta = point.subtract(this._drag.dragOrigin);

    // Update visual position only (no ECHO write during drag).
    this._drag.mesh.position = this._drag.startPosition.add(delta);

    ctx.setDebugStats({
      x: this._drag.mesh.position.x.toFixed(2),
      y: this._drag.mesh.position.y.toFixed(2),
      z: this._drag.mesh.position.z.toFixed(2),
    });

    return true;
  }

  onPointerUp(ctx: ToolContext, _info: PointerInfo): boolean {
    if (!this._drag) {
      return false;
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
