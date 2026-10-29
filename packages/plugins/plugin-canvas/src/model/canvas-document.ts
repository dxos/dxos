//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { Scene, type StoredLayout, type StoredModel, type StoredScene, readDocument } from '@dxos/scene';

import { Canvas } from '#types';

const isStoredScene = (value: unknown): value is StoredScene =>
  Obj.instanceOf(Scene.Scene2D, value) || Obj.instanceOf(Scene.Scene3D, value);

const isStoredLayout = (value: unknown): value is StoredLayout =>
  Obj.instanceOf(Scene.Layout2D, value) || Obj.instanceOf(Scene.Layout3D, value);

const isStoredModel = (value: unknown): value is StoredModel =>
  Obj.instanceOf(Scene.Model2D, value) || Obj.instanceOf(Scene.Model3D, value);

/** A new canvas and its first model, layout and scene, none of them in a database yet. */
export type NewCanvas = { canvas: Canvas.Canvas; model: StoredModel; layout: StoredLayout; scene: StoredScene };

const ORIGIN_2D: Scene.Camera2D = { center: { x: 0, y: 0 }, zoom: 1 };
const ORIGIN_3D: Scene.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: -45,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
};

/**
 * A canvas with `settings`, over one empty model, one layout placing its objects and one scene viewing that layout;
 * `dimension` (2D by default) picks which kind. The caller adds the objects to a database together.
 */
export const makeCanvas = ({
  dimension = '2d',
  ...settings
}: Partial<Canvas.CanvasSettings> & { dimension?: Scene.Dimension } = {}): NewCanvas => {
  const content =
    dimension === '2d'
      ? (() => {
          const model = Obj.make(Scene.Model2D, { key: 'model', objects: {} });
          const layout = Obj.make(Scene.Layout2D, { key: 'layout', model: Ref.make(model), elements: {} });
          const scene = Obj.make(Scene.Scene2D, { key: 'scene', layout: Ref.make(layout), camera: ORIGIN_2D });
          return { model, layout, scene };
        })()
      : (() => {
          const model = Obj.make(Scene.Model3D, { key: 'model', objects: {} });
          const layout = Obj.make(Scene.Layout3D, { key: 'layout', model: Ref.make(model), elements: {} });
          const scene = Obj.make(Scene.Scene3D, { key: 'scene', layout: Ref.make(layout), camera: ORIGIN_3D });
          return { model, layout, scene };
        })();
  const canvas = Obj.make(Canvas.Canvas, {
    settings,
    model: Ref.make(content.model),
    layouts: [Ref.make(content.layout)],
    scenes: [Ref.make(content.scene)],
  });
  return { canvas, ...content };
};

/** Makes a canvas as {@link makeCanvas} does and adds it, with its model, layout and scene, to the database. */
export const addCanvas = Effect.fn(function* (settings: Parameters<typeof makeCanvas>[0] = {}) {
  const { canvas, model, layout, scene } = makeCanvas(settings);
  yield* Database.add(model);
  yield* Database.add(layout);
  yield* Database.add(scene);
  return yield* Database.add(canvas);
});

/** The scene a canvas opens at: its first, when it has loaded. */
export const openScene = (canvas: Canvas.Canvas): StoredScene | undefined => {
  const scene = canvas.scenes[0]?.target;
  return isStoredScene(scene) ? scene : undefined;
};

/** Every loaded scene, layout and model the canvas lists, in record form; the first scene is the root. */
export const canvasDocument = (canvas: Canvas.Canvas): Scene.SceneDocument => {
  const model = canvas.model?.target;
  return readDocument({
    scenes: canvas.scenes.flatMap((ref) => (isStoredScene(ref.target) ? [ref.target] : [])),
    layouts: canvas.layouts.flatMap((ref) => (isStoredLayout(ref.target) ? [ref.target] : [])),
    models: isStoredModel(model) ? [model] : [],
  });
};

/** Whether any of the canvas's scenes, or a composite object of its model, still shows `layout`. */
const layoutInUse = (canvas: Canvas.Canvas, layout: StoredLayout): boolean => {
  const model = canvas.model?.target;
  return (
    canvas.scenes.some((ref) => isStoredScene(ref.target) && ref.target.layout.target === layout) ||
    (isStoredModel(model) && Object.values(model.objects).some((object) => object.parts?.target === layout))
  );
};

/**
 * Removes `scene` from the canvas, and from its database; its layout goes too unless another scene or a composite
 * object's parts still shows it, so deleting one of two saved views of a drawing keeps the drawing.
 */
export const deleteScene = (canvas: Canvas.Canvas, scene: StoredScene) => {
  const layout = scene.layout.target;
  Obj.update(canvas, (canvas) => {
    const index = canvas.scenes.findIndex((ref) => ref.target === scene);
    index >= 0 && canvas.scenes.splice(index, 1);
  });
  const db = Obj.getDatabase(scene);
  db?.remove(scene);
  if (isStoredLayout(layout) && !layoutInUse(canvas, layout)) {
    Obj.update(canvas, (canvas) => {
      const index = canvas.layouts.findIndex((ref) => ref.target === layout);
      index >= 0 && canvas.layouts.splice(index, 1);
    });
    Obj.getDatabase(layout)?.remove(layout);
  }
};
