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
  /** Whether dragging on vertical (Y) axis instead of horizontal (XZ). */
  vertical: boolean;
  /** Other objects being moved along (multi-select). */
  companions: Array<{ objectId: string; mesh: Mesh; startPosition: Vector3 }>;
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

    // Ray-cast the initial click onto the drag plane to get a consistent drag origin.
    const startEvent = info.event as PointerEvent;

    // Detect platform modifier: metaKey (Cmd on macOS) or altKey (Alt on Windows/Linux).
    const useVertical = startEvent.metaKey || startEvent.altKey;

    let plane: Plane;
    if (useVertical) {
      // Vertical drag: use a plane facing the camera that passes through the object.
      const cameraDir = ctx.camera.getForwardRay().direction;
      const planeNormal = new Vector3(cameraDir.x, 0, cameraDir.z).normalize();
      plane = Plane.FromPositionAndNormal(startPosition, planeNormal);
    } else {
      // Horizontal drag: XZ ground plane at object's Y level.
      plane = Plane.FromPositionAndNormal(new Vector3(0, startPosition.y, 0), Vector3.Up());
    }

    const startRay = ctx.scene.createPickingRay(startEvent.clientX, startEvent.clientY, null, ctx.camera);
    const startDist = startRay.intersectsPlane(plane);
    if (startDist === null) {
      return false;
    }
    const dragOrigin = startRay.origin.add(startRay.direction.scale(startDist));

    // Collect companions from multi-selection.
    const companions: DragState['companions'] = [];
    if (ctx.selection?.type === 'multi-object') {
      for (const entry of ctx.selection.entries) {
        if (entry.objectId !== objectId) {
          companions.push({
            objectId: entry.objectId,
            mesh: entry.mesh,
            startPosition: entry.mesh.position.clone(),
          });
        }
      }
    }

    this._drag = { objectId, mesh, startPosition, dragOrigin, plane, vertical: useVertical, companions };
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

    // In vertical mode, only allow Y movement.
    if (this._drag.vertical) {
      delta = new Vector3(0, delta.y, 0);
    }

    // Update visual position, snapping to global grid when shift is held.
    const newPos = this._drag.startPosition.add(delta);
    if (event.shiftKey) {
      newPos.x = snapToGrid(newPos.x);
      newPos.y = snapToGrid(newPos.y);
      newPos.z = snapToGrid(newPos.z);
    }
    this._drag.mesh.position = newPos;

    // Move companions by the same delta.
    const moveDelta = newPos.subtract(this._drag.startPosition);
    for (const companion of this._drag.companions) {
      const companionPos = companion.startPosition.add(moveDelta);
      if (event.shiftKey) {
        companionPos.x = snapToGrid(companionPos.x);
        companionPos.y = snapToGrid(companionPos.y);
        companionPos.z = snapToGrid(companionPos.z);
      }
      companion.mesh.position = companionPos;
    }

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

    // Commit companion positions to ECHO.
    for (const companion of this._drag.companions) {
      const companionObj = ctx.getObject(companion.objectId);
      if (companionObj) {
        Obj.change(companionObj, (obj) => {
          obj.position = {
            x: companion.mesh.position.x,
            y: companion.mesh.position.y,
            z: companion.mesh.position.z,
          };
        });
      }
    }

    // Re-select the object to refresh the debug panel.
    ctx.setSelection({ type: 'object', objectId, mesh, highlightMesh: null });

    ctx.camera.attachControl(ctx.canvas, true);
    this._drag = null;
    return true;
  }
}
