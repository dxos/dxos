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

/** The scene a canvas opens at: the one a viewer picked (`key`) when the canvas lists it, else its first, once loaded. */
export const openScene = (canvas: Canvas.Canvas, key?: string): StoredScene | undefined => {
  const picked =
    key === undefined
      ? undefined
      : canvas.scenes.map((ref) => ref.target).find((scene) => isStoredScene(scene) && scene.key === key);
  const scene = picked ?? canvas.scenes[0]?.target;
  return isStoredScene(scene) ? scene : undefined;
};

/** Which editor the canvas opens in: its open scene's dimension, once that has loaded. */
export const canvasDimension = (canvas: Canvas.Canvas): Scene.Dimension | undefined => {
  const scene = openScene(canvas);
  return Obj.instanceOf(Scene.Scene3D, scene) ? '3d' : Obj.instanceOf(Scene.Scene2D, scene) ? '2d' : undefined;
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

/**
 * Adds a scene over `scene`'s layout at `camera`, as another saved view of the same drawing, and lists it last; in
 * either dimension, the camera being the scene's own kind.
 */
export function addScene(canvas: Canvas.Canvas, scene: Scene.Scene2D, camera: Scene.Camera2D): Scene.Scene2D;
export function addScene(canvas: Canvas.Canvas, scene: Scene.Scene3D, camera: Scene.Camera3D): Scene.Scene3D;
export function addScene(
  canvas: Canvas.Canvas,
  scene: Scene.Scene2D | Scene.Scene3D,
  camera: Scene.Camera2D | Scene.Camera3D,
): Scene.Scene2D | Scene.Scene3D {
  const key = freeSceneKey(canvas, scene.key);
  const layout = scene.layout.target;
  // A stored scene's camera is that object's own; the new scene gets a plain copy.
  const copy = structuredClone(Obj.getSnapshot(scene).camera);
  const given = camera === scene.camera ? copy : camera;
  const added =
    Obj.instanceOf(Scene.Scene2D, scene) && Obj.instanceOf(Scene.Layout2D, layout) && isCamera2D(given)
      ? Obj.make(Scene.Scene2D, { key, layout: Ref.make(layout), camera: given })
      : Obj.instanceOf(Scene.Scene3D, scene) && Obj.instanceOf(Scene.Layout3D, layout) && !isCamera2D(given)
        ? Obj.make(Scene.Scene3D, { key, layout: Ref.make(layout), camera: given })
        : undefined;
  if (!added) {
    throw new Error('A scene is added over a loaded layout of its own dimension.');
  }
  Obj.getDatabase(canvas)?.add(added);
  Obj.update(canvas, (canvas) => {
    canvas.scenes.push(Ref.make(added));
  });
  return added;
}

const isCamera2D = (camera: Scene.Camera2D | Scene.Camera3D): camera is Scene.Camera2D => 'zoom' in camera;

/** The first `<base>:<n>` no scene of the canvas uses. */
const freeSceneKey = (canvas: Canvas.Canvas, base: string): string => {
  const taken = new Set(canvas.scenes.flatMap((ref) => (isStoredScene(ref.target) ? [ref.target.key] : [])));
  let index = canvas.scenes.length;
  while (taken.has(`${base}:${index}`)) {
    index++;
  }
  return `${base}:${index}`;
};

/** The canvas's model and every model one of its layouts places objects from. */
const canvasModels = (canvas: Canvas.Canvas): Set<StoredModel> =>
  new Set(
    [
      canvas.model?.target,
      ...canvas.layouts.map((ref) => (isStoredLayout(ref.target) ? ref.target.model?.target : undefined)),
    ].filter(isStoredModel),
  );

/** Whether any of the canvas's scenes, or a composite object of any of its models, still shows `layout`. */
const layoutInUse = (canvas: Canvas.Canvas, layout: StoredLayout): boolean =>
  canvas.scenes.some((ref) => isStoredScene(ref.target) && ref.target.layout.target === layout) ||
  [...canvasModels(canvas)].some((model) =>
    Object.values(model.objects).some((object) => object.parts?.target === layout),
  );

/** Loads `ref`'s target, or nothing when it no longer resolves. */
const loadTarget = <T>(ref: Ref.Ref<T> | undefined): Effect.Effect<T | undefined> =>
  ref === undefined
    ? Effect.succeed(undefined)
    : Database.load(ref).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)));

/**
 * Loads the scenes, layouts and models a canvas reaches, so code reading `ref.target` outside a view (which loads them
 * as it draws) sees the whole canvas.
 */
export const loadCanvas = Effect.fn(function* (canvas: Canvas.Canvas) {
  yield* loadTarget(canvas.model);
  for (const ref of [...canvas.scenes, ...canvas.layouts]) {
    const target = yield* loadTarget(ref);
    if (isStoredLayout(target)) {
      yield* loadTarget(target.model);
    }
  }
});

/** Removes a canvas from its database together with the scenes, layouts and models it lists. */
export const removeCanvas = (canvas: Canvas.Canvas) => {
  const db = Obj.getDatabase(canvas);
  if (!db) {
    return;
  }
  const owned = [
    ...canvas.scenes.map((ref) => ref.target).filter(isStoredScene),
    ...canvas.layouts.map((ref) => ref.target).filter(isStoredLayout),
    ...canvasModels(canvas),
  ];
  db.remove(canvas);
  for (const object of owned) {
    db.remove(object);
  }
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
