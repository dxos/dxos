//
// Copyright 2026 DXOS.org
//

import type { Manifold } from 'manifold-3d';

import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { Model } from '#types';

import { serializeManifold, subtractSolids } from '../../engine/index.ts';
import { type ActionHandler, disposeSceneObject } from '../action.ts';
import { type ToolContext, getSelectedObjectIds } from '../tool-context.ts';

/** Subtracts selected objects from the first selected object (A - B - C). */
export class SubtractObjectsAction implements ActionHandler {
  readonly id = 'subtract-objects';

  execute(ctx: ToolContext): void {
    const scene = ctx.echoScene;
    const selectedObjectIds = getSelectedObjectIds(ctx.editorState.selection);
    if (!scene || selectedObjectIds.length < 2) {
      return;
    }

    const solids: Manifold[] = [];
    const positions: Model.Vec3[] = [];
    const objectsToDelete: string[] = [];

    for (const objId of selectedObjectIds) {
      const solid = ctx.solids.get(objId);
      const obj = ctx.getObject(objId);
      if (!solid || !obj) {
        continue;
      }
      solids.push(solid);
      positions.push({ x: obj.position.x, y: obj.position.y, z: obj.position.z });
      objectsToDelete.push(objId);
    }

    if (solids.length < 2) {
      return;
    }

    log.info('SubtractObjectsAction.execute', { count: solids.length });

    const result = subtractSolids(ctx.manifold, solids, positions);
    const meshData = serializeManifold(result.solid);
    const firstObj = ctx.getObject(objectsToDelete[0]);

    const newObject = Model.make({
      primitive: undefined,
      mesh: meshData,
      position: result.position,
      color: firstObj?.color,
    });

    ctx.setSelection(null);

    Obj.update(scene, (scene) => {
      for (const objId of objectsToDelete) {
        const index = scene.objects.findIndex((ref) => (ref?.target as any)?.id === objId);
        if (index !== -1) {
          scene.objects.splice(index, 1);
        }
      }
      scene.objects.push(Ref.make(newObject));
    });

    for (const objId of objectsToDelete) {
      disposeSceneObject(ctx, objId);
    }

    result.solid.delete();

    const newObjId = (newObject as any).id as string;
    ctx.editorState.pendingSelection = [newObjId];
  }
}
