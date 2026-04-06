//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { parseOBJ, presetObjData } from '../../engine';
import { Model } from '../../types';
import { type ActionHandler } from '../action';
import { type ToolContext } from '../tool-context';

/** Creates a new primitive or preset object in the scene. */
export class AddObjectAction implements ActionHandler {
  readonly id = 'add-object';

  execute(ctx: ToolContext): void {
    const scene = ctx.echoScene;
    if (!scene) {
      return;
    }

    const { template, hue } = ctx.editorState;
    log.info('AddObjectAction.execute', { template: template, hue });

    const objData = presetObjData[template as Model.PresetType];
    let object: Model.Object;

    if (objData) {
      const parsed = parseOBJ(objData);
      if (!parsed) {
        return;
      }
      object = Model.make({
        primitive: undefined,
        label: template,
        mesh: {
          vertexData: Model.encodeTypedArray(parsed.positions),
          indexData: Model.encodeTypedArray(parsed.indices),
        },
        color: hue,
      });
    } else {
      object = Model.make({
        primitive: template as Model.PrimitiveType,
        color: hue,
      });
    }

    Obj.change(scene, (sceneObj) => {
      sceneObj.objects.push(Ref.make(object));
    });
    Obj.setParent(object, scene);

    const objId = (object as any).id as string | undefined;
    if (objId) {
      ctx.editorState.pendingSelection = [objId];
    }
  }
}
