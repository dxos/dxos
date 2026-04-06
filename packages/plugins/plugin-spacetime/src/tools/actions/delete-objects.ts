//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { type ActionHandler, type ActionResult, type EditorState, disposeSceneObject } from '../action';
import { type ToolContext } from '../tool-context';

/** Deletes selected objects from the ECHO scene and disposes their runtime resources. */
export class DeleteObjectsAction implements ActionHandler {
  readonly id = 'delete-objects';

  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined {
    const scene = ctx.echoScene;
    const { selectedObjectIds } = editorState;
    if (!scene || selectedObjectIds.length === 0) {
      return undefined;
    }

    log.info('DeleteObjectsAction.execute', { count: selectedObjectIds.length });

    // Clear selection before disposing meshes (handles highlight cleanup).
    ctx.setSelection(null);

    // Remove from ECHO scene.
    Obj.change(scene, (sceneObj) => {
      for (const objId of selectedObjectIds) {
        const index = sceneObj.objects.findIndex((ref) => (ref?.target as any)?.id === objId);
        if (index !== -1) {
          sceneObj.objects.splice(index, 1);
        }
      }
    });

    // Dispose runtime meshes and solids.
    for (const objId of selectedObjectIds) {
      disposeSceneObject(ctx, objId);
    }

    return { selectObjectIds: [] };
  }
}
