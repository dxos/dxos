//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { Model } from '#types';

import * as SpacetimePresets from '../../SpacetimePresets.ts';
import { type ActionHandler } from '../action.ts';
import { type ToolContext } from '../tool-context.ts';

const isPreset = (template: Model.ObjectTemplate): template is Model.PresetType =>
  Model.PresetType.literals.some((preset) => preset === template);

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

    const object = isPreset(template)
      ? SpacetimePresets.make(template, { color: hue })
      : Model.make({ primitive: template, color: hue });
    if (!object) {
      return;
    }

    Obj.update(scene, (scene) => {
      scene.objects.push(Ref.make(object));
    });

    ctx.editorState.pendingSelection = [object.id];
  }
}
