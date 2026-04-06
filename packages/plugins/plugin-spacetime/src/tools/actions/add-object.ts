//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { parseOBJ, presetObjData } from '../../engine';
import { Model } from '../../types';
import { type ActionHandler, type ActionResult, type EditorState } from '../action';
import { type ToolContext } from '../tool-context';

/** Creates a new primitive or preset object in the scene. */
export class AddObjectAction implements ActionHandler {
  readonly id = 'add-object';

  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined {
    const scene = ctx.echoScene;
    if (!scene) {
      return undefined;
    }

    const { selectedTemplate, hue } = editorState;
    log.info('AddObjectAction.execute', { template: selectedTemplate, hue });

    const objData = presetObjData[selectedTemplate as Model.PresetType];
    let object: Model.Object;

    if (objData) {
      const parsed = parseOBJ(objData);
      if (!parsed) {
        return undefined;
      }
      object = Model.make({
        primitive: undefined,
        label: selectedTemplate,
        mesh: {
          vertexData: Model.encodeTypedArray(parsed.positions),
          indexData: Model.encodeTypedArray(parsed.indices),
        },
        color: hue,
      });
    } else {
      object = Model.make({
        primitive: selectedTemplate as Model.PrimitiveType,
        color: hue,
      });
    }

    Obj.change(scene, (sceneObj) => {
      sceneObj.objects.push(Ref.make(object));
    });
    Obj.setParent(object, scene);

    const objId = (object as any).id as string | undefined;
    return objId ? { selectObjectIds: [objId] } : undefined;
  }
}
