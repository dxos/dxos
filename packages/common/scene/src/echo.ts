//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';

import {
  type Element2D,
  type Element3D,
  Layout2D,
  Layout3D,
  type LayoutRecord,
  Model2D,
  Model3D,
  type ModelRecord,
  type Object2D,
  type Object3D,
  Scene2D,
  Scene3D,
  type SceneDocument,
  type SceneRecord,
  type StoredObject2D,
  type StoredObject3D,
} from './Scene.ts';

export type StoredScene = Scene2D | Scene3D;
export type StoredLayout = Layout2D | Layout3D;
export type StoredModel = Model2D | Model3D;

/** The ECHO objects a document makes, by their record ids; `root` is the first scene's. */
export type StoredDocument = {
  root: StoredScene;
  scenes: Map<string, StoredScene>;
  layouts: Map<string, StoredLayout>;
  models: Map<string, StoredModel>;
};

/** A deep copy free of ECHO proxies, so records read back are plain data. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const isStoredLayout = (value: unknown): value is StoredLayout =>
  Obj.instanceOf(Layout2D, value) || Obj.instanceOf(Layout3D, value);

const isStoredModel = (value: unknown): value is StoredModel =>
  Obj.instanceOf(Model2D, value) || Obj.instanceOf(Model3D, value);

const storeLayout = (record: LayoutRecord): StoredLayout => {
  const fields = {
    ...(record.name === undefined ? {} : { name: record.name }),
    ...(record.props === undefined ? {} : { props: record.props }),
  };
  return record.dim === '2d'
    ? Obj.make(Layout2D, { key: record.id, ...fields, elements: record.elements })
    : Obj.make(Layout3D, { key: record.id, ...fields, elements: record.elements });
};

const storeObject = <O extends Object2D | Object3D>(
  object: O,
  layouts: ReadonlyMap<string, StoredLayout>,
): Omit<O, 'parts'> & { parts?: Ref.Ref<StoredLayout> } => {
  const { parts, ...rest } = object;
  const target = parts === undefined ? undefined : layouts.get(parts);
  return target ? { ...rest, parts: Ref.make(target) } : rest;
};

const storeModel = (record: ModelRecord, layouts: ReadonlyMap<string, StoredLayout>): StoredModel => {
  if (record.dim === '2d') {
    const objects: Record<string, StoredObject2D> = {};
    for (const [key, object] of Object.entries(record.objects)) {
      objects[key] = storeObject(object, layouts);
    }
    return Obj.make(Model2D, { key: record.id, ...(record.name ? { name: record.name } : {}), objects });
  }
  const objects: Record<string, StoredObject3D> = {};
  for (const [key, object] of Object.entries(record.objects)) {
    objects[key] = storeObject(object, layouts);
  }
  return Obj.make(Model3D, { key: record.id, ...(record.name ? { name: record.name } : {}), objects });
};

const storeScene = (record: SceneRecord, layout: StoredLayout | undefined): StoredScene | undefined => {
  const { id, layout: _layout, ...rest } = record;
  if (rest.dim === '2d' && Obj.instanceOf(Layout2D, layout)) {
    const { dim: _dim, ...fields } = rest;
    return Obj.make(Scene2D, { ...fields, key: id, layout: Ref.make(layout) });
  }
  if (rest.dim === '3d' && Obj.instanceOf(Layout3D, layout)) {
    const { dim: _dim, ...fields } = rest;
    return Obj.make(Scene3D, { ...fields, key: id, layout: Ref.make(layout) });
  }
  return undefined;
};

/**
 * Makes one ECHO object per scene, layout and model (design call 20). Layouts and models reference each other (a
 * model's composite objects hold their parts layouts, a layout its model), so layouts are made first, then models,
 * and then each layout's model Ref is set; a scene, made last, holds a Ref to its layout. A scene whose layout is
 * missing or of the other dimension is not made.
 */
export const toEcho = (doc: SceneDocument): StoredDocument => {
  const layouts = new Map(doc.layouts.map((record) => [record.id, storeLayout(record)]));
  const models = new Map(doc.models.map((record) => [record.id, storeModel(record, layouts)]));
  for (const record of doc.layouts) {
    const layout = layouts.get(record.id);
    const model = record.model === undefined ? undefined : models.get(record.model);
    if (layout && model) {
      Obj.update(layout, (layout) => {
        layout.model = Ref.make(model);
      });
    }
  }
  const scenes = new Map<string, StoredScene>();
  for (const record of doc.scenes) {
    const scene = storeScene(record, layouts.get(record.layout));
    scene && scenes.set(record.id, scene);
  }
  const root = doc.scenes[0] && scenes.get(doc.scenes[0].id);
  if (!root) {
    throw new Error('A scene document needs a root scene over a layout of its dimension.');
  }
  return { root, scenes, layouts, models };
};

const readObject = <O extends StoredObject2D | StoredObject3D>({
  parts,
  ...object
}: O): { record: Omit<O, 'parts'> & { parts?: string }; parts?: StoredLayout } => {
  const target = parts?.target;
  return isStoredLayout(target)
    ? { record: { ...plain(object), parts: target.key }, parts: target }
    : { record: plain(object) };
};

/** Reads a scene, its layout, and every loaded model and parts layout they reach, back into record form. */
export const fromEcho = (root: StoredScene): SceneDocument => {
  const layouts: LayoutRecord[] = [];
  const models: ModelRecord[] = [];
  const seenLayouts = new Set<string>();
  const seenModels = new Set<string>();

  const visitModel = (model: StoredModel) => {
    if (seenModels.has(model.key)) {
      return;
    }
    seenModels.add(model.key);
    const name = model.name === undefined ? {} : { name: model.name };
    const reached: StoredLayout[] = [];
    if (Obj.instanceOf(Model2D, model)) {
      const objects: Record<string, Object2D> = {};
      for (const [key, object] of Object.entries(model.objects)) {
        const { record, parts } = readObject(object);
        objects[key] = record;
        parts && reached.push(parts);
      }
      models.push({ id: model.key, dim: '2d', ...name, objects });
    } else {
      const objects: Record<string, Object3D> = {};
      for (const [key, object] of Object.entries(model.objects)) {
        const { record, parts } = readObject(object);
        objects[key] = record;
        parts && reached.push(parts);
      }
      models.push({ id: model.key, dim: '3d', ...name, objects });
    }
    reached.forEach(visitLayout);
  };

  const visitLayout = (layout: StoredLayout) => {
    if (seenLayouts.has(layout.key)) {
      return;
    }
    seenLayouts.add(layout.key);
    const target = layout.model?.target;
    const model = isStoredModel(target) ? target : undefined;
    const base = {
      id: layout.key,
      ...(layout.name === undefined ? {} : { name: layout.name }),
      ...(model ? { model: model.key } : {}),
      ...(layout.props === undefined ? {} : { props: plain({ ...layout.props }) }),
    };
    if (Obj.instanceOf(Layout2D, layout)) {
      const elements: Record<string, Element2D> = plain({ ...layout.elements });
      layouts.push({ ...base, dim: '2d', elements });
    } else {
      const elements: Record<string, Element3D> = plain({ ...layout.elements });
      layouts.push({ ...base, dim: '3d', elements });
    }
    model && visitModel(model);
  };

  const layout = root.layout.target;
  const base = plain({ id: root.key, name: root.name, theme: root.theme });
  const scene: SceneRecord = Obj.instanceOf(Scene2D, root)
    ? { ...base, dim: '2d', layout: layout?.key ?? '', camera: plain(root.camera) }
    : { ...base, dim: '3d', layout: layout?.key ?? '', camera: plain(root.camera) };
  layout && visitLayout(layout);
  return { scenes: [scene], layouts, models };
};
