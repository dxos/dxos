//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { type ModelIntent, type Problem, Scene, applyModelIntent } from '@dxos/scene';

import { type Canvas } from '#types';

import { canvasDocument } from './canvas-document.ts';
import { plain, same } from './layout-writer.ts';

type StoredLayout = Scene.Layout2D | Scene.Layout3D;
type StoredModel = Scene.Model2D | Scene.Model3D;

const isStoredLayout = (value: unknown): value is StoredLayout =>
  Obj.instanceOf(Scene.Layout2D, value) || Obj.instanceOf(Scene.Layout3D, value);
const isStoredModel = (value: unknown): value is StoredModel =>
  Obj.instanceOf(Scene.Model2D, value) || Obj.instanceOf(Scene.Model3D, value);

/** Writes the record layout's elements onto its stored layout, element by element, only where they changed. */
const writeElements = (stored: StoredLayout, record: Scene.LayoutRecord): void => {
  const ids = new Set([...Object.keys(stored.elements), ...Object.keys(record.elements)]);
  const changed = [...ids].filter((id) => !same(stored.elements[id], record.elements[id]));
  changed.length > 0 &&
    Obj.update(stored, (stored) => {
      for (const id of changed) {
        const element = record.elements[id];
        element === undefined ? delete stored.elements[id] : (stored.elements[id] = plain(element));
      }
    });
};

/**
 * Applies a model intent to the canvas's stored model and layouts: objects are written field by field with their parts
 * as Refs, layouts the intent made are stored and listed on the canvas. Returns the problems that refused it, having
 * written nothing then.
 */
export const writeModelIntent = (canvas: Canvas.Canvas, intent: ModelIntent): Problem[] => {
  const before = canvasDocument(canvas);
  const { doc, problems } = applyModelIntent(before, intent);
  if (problems.length > 0 || doc === before) {
    return problems;
  }
  writeDocument(canvas, doc);
  return [];
};

/**
 * Writes `doc` over the canvas's stored layouts and models: changed elements and objects, new layouts stored and
 * listed, and layouts the canvas lists that `doc` has not removed. Writing the document from before a model edit undoes
 * it; the one after redoes it.
 */
export const writeDocument = (canvas: Canvas.Canvas, doc: Scene.SceneDocument): void => {
  const db = Obj.getDatabase(canvas);
  const layouts = new Map(
    canvas.layouts.flatMap((ref) => (isStoredLayout(ref.target) ? [[ref.target.key, ref.target] as const] : [])),
  );
  const models = new Map(
    [canvas.model?.target, ...[...layouts.values()].map((layout) => layout.model?.target)]
      .filter(isStoredModel)
      .map((model) => [model.key, model]),
  );
  const created: StoredLayout[] = [];
  for (const record of doc.layouts) {
    const stored = layouts.get(record.id);
    if (stored) {
      writeElements(stored, record);
      // An extract gives a layout with no model the one its new element places from.
      const model = record.model === undefined ? undefined : models.get(record.model);
      model &&
        stored.model?.target !== model &&
        Obj.update(stored, (stored) => {
          stored.model = Ref.make(model);
        });
      continue;
    }
    const model = record.model === undefined ? undefined : models.get(record.model);
    const ref = model ? { model: Ref.make(model) } : {};
    const layout =
      record.dim === '3d'
        ? Obj.make(Scene.Layout3D, { key: record.id, elements: plain(record.elements), ...ref })
        : Obj.make(Scene.Layout2D, { key: record.id, elements: plain(record.elements), ...ref });
    db?.add(layout);
    layouts.set(record.id, layout);
    created.push(layout);
  }
  for (const record of doc.models) {
    const stored = models.get(record.id);
    if (!stored) {
      continue;
    }
    const ids = new Set([...Object.keys(stored.objects), ...Object.keys(record.objects)]);
    // ECHO stores exactly the object schema's fields, so a record carrying others (an imported file's label) keeps
    // only those rather than have the whole write refused.
    const known = new Set(Object.keys(record.dim === '3d' ? Scene.Object3D.fields : Scene.Object2D.fields));
    Obj.update(stored, (stored) => {
      for (const id of ids) {
        const object = record.objects[id];
        if (object === undefined) {
          delete stored.objects[id];
          continue;
        }
        const { parts, ...fields } = object;
        for (const key of Object.keys(fields)) {
          known.has(key) || Reflect.deleteProperty(fields, key);
        }
        const target = parts === undefined ? undefined : layouts.get(parts);
        const next = { ...plain(fields), ...(target ? { parts: Ref.make(target) } : {}) };
        const current = stored.objects[id];
        const currentParts = current?.parts?.target;
        if (
          !current ||
          !same({ ...current, parts: undefined }, { ...next, parts: undefined }) ||
          currentParts !== target
        ) {
          stored.objects[id] = next;
        }
      }
    });
  }
  created.length > 0 &&
    Obj.update(canvas, (canvas) => {
      canvas.layouts.push(...created.map((layout) => Ref.make(layout)));
    });
  // A layout the document no longer has (an undone extract's parts) leaves the canvas.
  const kept = new Set(doc.layouts.map((record) => record.id));
  const gone = [...layouts.values()].filter((layout) => !kept.has(layout.key));
  if (gone.length > 0) {
    Obj.update(canvas, (canvas) => {
      canvas.layouts = canvas.layouts.filter((ref) => !gone.some((layout) => ref.target === layout));
    });
    gone.forEach((layout) => db?.remove(layout));
  }
};
