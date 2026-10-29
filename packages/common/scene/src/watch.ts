//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

import { type StoredLayout, type StoredModel, type StoredScene } from './echo.ts';
import { Layout2D, Layout3D, Model2D, Model3D } from './Scene.ts';

const isStoredLayout = (value: unknown): value is StoredLayout =>
  Obj.instanceOf(Layout2D, value) || Obj.instanceOf(Layout3D, value);

const isStoredModel = (value: unknown): value is StoredModel =>
  Obj.instanceOf(Model2D, value) || Obj.instanceOf(Model3D, value);

/**
 * Every loaded object a scene draws from, each once, in the order they are reached: the scene, its layout, the
 * layout's model, then each composite object's parts layout and that layout's model, depth first. Whatever renders
 * or plays the scene subscribes to all of them, so an edit to a parts layout shows.
 */
export const reachedObjects = (scene: StoredScene): Obj.Any[] => {
  const reached: Obj.Any[] = [scene];
  const seen = new Set<Obj.Any>([scene]);

  const visitLayout = (layout: StoredLayout) => {
    if (seen.has(layout)) {
      return;
    }
    seen.add(layout);
    reached.push(layout);
    const model = layout.model?.target;
    isStoredModel(model) && visitModel(model);
  };

  const visitModel = (model: StoredModel) => {
    if (seen.has(model)) {
      return;
    }
    seen.add(model);
    reached.push(model);
    for (const object of Object.values(model.objects)) {
      const parts = object.parts?.target;
      isStoredLayout(parts) && visitLayout(parts);
    }
  };

  const layout = scene.layout.target;
  isStoredLayout(layout) && visitLayout(layout);
  return reached;
};
