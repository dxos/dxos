//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import type { Manifold } from 'manifold-3d';

import { joinSolids, serializeManifold } from '../../engine';
import { Model } from '../../types';
import { type ActionHandler, type ActionResult, type EditorState, disposeSceneObject } from '../action';
import { type ToolContext } from '../tool-context';

/** Joins (unions) selected objects into a single merged object. */
export class JoinObjectsAction implements ActionHandler {
  readonly id = 'join-objects';

  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined {
    const scene = ctx.echoScene;
    const { selectedObjectIds } = editorState;
    if (!scene || selectedObjectIds.length < 2) {
      return undefined;
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
      return undefined;
    }

    log.info('JoinObjectsAction.execute', { count: solids.length });

    const result = joinSolids(ctx.manifold, solids, positions);
    const meshData = serializeManifold(result.solid);
    const firstObj = ctx.getObject(objectsToDelete[0]);

    const newObject = Model.make({
      primitive: undefined,
      mesh: meshData,
      position: result.position,
      color: firstObj?.color,
    });

    ctx.setSelection(null);

    Obj.change(scene, (sceneObj) => {
      for (const objId of objectsToDelete) {
        const index = sceneObj.objects.findIndex((ref) => (ref?.target as any)?.id === objId);
        if (index !== -1) {
          sceneObj.objects.splice(index, 1);
        }
      }
      sceneObj.objects.push(Ref.make(newObject));
    });
    Obj.setParent(newObject, scene);

    for (const objId of objectsToDelete) {
      disposeSceneObject(ctx, objId);
    }

    result.solid.delete();

    const newObjId = (newObject as any).id as string;
    return { selectObjectIds: [newObjId] };
  }
}
