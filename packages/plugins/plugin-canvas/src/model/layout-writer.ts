//
// Copyright 2026 DXOS.org
//

//
// Writes react-ui-canvas Views back to the Layout2D objects a scene reaches, element by element: each View is the
// layout of its id, a View with no layout is written as a new one, and the composite objects its portals and
// instances place go to the root layout's model. The layout store and the content facade both write through it.
//

import type * as Types from 'effect/Types';

import { type Database, Obj, Ref } from '@dxos/echo';
import { type View, type ViewMap } from '@dxos/react-ui-canvas/headless';
import { fromCanvasView } from '@dxos/react-ui-scene/canvas';
import { Scene, type ViewId, reachedObjects } from '@dxos/scene';

import { type Canvas } from '#types';

/** A deep copy free of ECHO proxies, writable as a new record of an object. */
export const plain = <T>(value: T): Types.DeepMutable<T> => JSON.parse(JSON.stringify(value));

export const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export const isLayout2D = (value: unknown): value is Scene.Layout2D => Obj.instanceOf(Scene.Layout2D, value);
export const isModel2D = (value: unknown): value is Scene.Model2D => Obj.instanceOf(Scene.Model2D, value);

/** An element placing `object` without the size and style values it would read from the object anyway. */
const overObject = (
  element: Types.DeepMutable<Scene.Element2D>,
  object: Scene.StoredObject2D,
): Types.DeepMutable<Scene.Element2D> => {
  const { size, overrides, ...rest } = element;
  const ownStyle = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([key, value]) => !same(value, Reflect.get(object.overrides ?? {}, key))),
  );
  return {
    ...rest,
    ...(size && !same(size, object.size) ? { size } : {}),
    ...(Object.keys(ownStyle).length > 0 ? { overrides: ownStyle } : {}),
  };
};

/** A View's node or link by id, as compared between writes. */
const elementOf = (view: View | undefined, id: string): unknown => view?.nodes[id] ?? view?.links[id];

const elementIds = (view: View): string[] => [...Object.keys(view.nodes), ...Object.keys(view.links)];

/** The View-level fields a layout keeps. */
const viewFields = (view: View | undefined) => view && [view.name, view.layers, view.kind, view.anonymous];

/**
 * Writes what changed between two Views to the layout the View was read from: each changed node or link as its
 * element, one element per change, and the View's name and props when they changed. An element that placed a model
 * object keeps placing it while it is still that object's kind.
 */
const writeLayout = (
  layout: Scene.Layout2D,
  view: View,
  previous: View | undefined,
  record: Scene.LayoutRecord2D,
  objectOf: (object: string) => Scene.StoredObject2D | undefined,
) => {
  const set = elementIds(view).filter((id) => !previous || !same(elementOf(previous, id), elementOf(view, id)));
  const remove = previous
    ? elementIds(previous).filter((id) => elementOf(view, id) === undefined)
    : Object.keys(layout.elements).filter((id) => !(id in record.elements));
  const fieldsChanged = !previous || !same(viewFields(previous), viewFields(view));
  if (set.length === 0 && remove.length === 0 && !fieldsChanged) {
    return;
  }
  Obj.update(layout, (layout) => {
    for (const id of set) {
      // Props other than the canvas's own belong to other writers (the DSL identity, say), so they are kept.
      const { canvas: _canvas, ...kept } = plain(layout.elements[id]?.props ?? {});
      const written = plain(record.elements[id]);
      const { type, ...element } = { ...written, props: { ...kept, ...written.props } };
      const placed = layout.elements[id]?.object;
      const object = placed === undefined ? undefined : objectOf(placed);
      layout.elements[id] =
        placed !== undefined && object && element.object === undefined && type === object.type
          ? overObject({ ...element, object: placed }, object)
          : { ...element, ...(type === undefined ? {} : { type }) };
    }
    for (const id of remove) {
      delete layout.elements[id];
    }
    if (fieldsChanged) {
      if (layout.name !== record.name) {
        layout.name = record.name;
      }
      // Props are not written: the projections keep their models there.
      if (!same(layout.layers, record.layers)) {
        layout.layers = record.layers && plain(record.layers);
      }
      if (layout.kind !== record.kind) {
        layout.kind = record.kind;
      }
      if (layout.anonymous !== record.anonymous) {
        layout.anonymous = record.anonymous;
      }
    }
  });
};

/** Adds fields to a layout record before it is written, such as the DSL identities the content facade keeps. */
export type DecorateLayout = (record: Scene.LayoutRecord2D) => Scene.LayoutRecord2D;

export type LayoutWriter = {
  /** The scene's root layout key: the View that opens first. */
  readonly root: ViewId;
  /** The 2D layouts and models the scene reaches now, by key; read again by {@link LayoutWriter.track}. */
  readonly layouts: ReadonlyMap<string, Scene.Layout2D>;
  readonly models: ReadonlyMap<string, Scene.Model2D>;
  /** Reads again what the scene reaches, returning every object it reaches. */
  track: () => Set<Obj.Any>;
  /** Writes what changed from `previous` (every element, without it) to the layouts. */
  write: (views: ViewMap, previous?: ViewMap, decorate?: DecorateLayout) => void;
};

/** The object an `instance` node of a composite places, which an unplaced composite takes too, so it is reached. */
const COMPOSITE_PREFIX = 'instance:';

export type LayoutWriterOptions = {
  /** The canvas the scene belongs to: the layouts and model a write makes are listed on it. */
  canvas?: Canvas.Canvas;
};

/** A writer of Views onto the layouts `scene` reaches. */
export const makeLayoutWriter = (scene: Scene.Scene2D, { canvas }: LayoutWriterOptions = {}): LayoutWriter => {
  const db: Database.Database | undefined = Obj.getDatabase(scene);
  const root: ViewId = scene.layout.target?.key ?? scene.key;
  const layouts = new Map<string, Scene.Layout2D>();
  const models = new Map<string, Scene.Model2D>();

  const track = () => {
    const reached = new Set(reachedObjects(scene));
    layouts.clear();
    models.clear();
    for (const object of reached) {
      isLayout2D(object) && layouts.set(object.key, object);
      isModel2D(object) && models.set(object.key, object);
    }
    return reached;
  };

  /** The root layout's model, made and attached when a write first places an object. */
  const rootModel = (): Scene.Model2D | undefined => {
    const layout = layouts.get(root);
    const existing = layout?.model?.target;
    if (isModel2D(existing) || !layout) {
      return isModel2D(existing) ? existing : undefined;
    }
    // The canvas's own model, when it has one, before a new one.
    const listed = canvas?.model?.target;
    const model = isModel2D(listed) ? listed : Obj.make(Scene.Model2D, { key: `${root}:model`, objects: {} });
    if (model !== listed) {
      db?.add(model);
      canvas &&
        Obj.update(canvas, (canvas) => {
          canvas.model = Ref.make(model);
        });
    }
    Obj.update(layout, (layout) => {
      layout.model = Ref.make(model);
    });
    models.set(model.key, model);
    return model;
  };

  const layoutFor = (view: View): Scene.Layout2D => {
    const existing = layouts.get(view.id);
    if (existing) {
      return existing;
    }
    const layout = Obj.make(Scene.Layout2D, { key: view.id, elements: {} });
    db?.add(layout);
    canvas &&
      Obj.update(canvas, (canvas) => {
        canvas.layouts.push(Ref.make(layout));
      });
    layouts.set(view.id, layout);
    return layout;
  };

  const objectOf = (layout: Scene.Layout2D) => (object: string) => {
    const model = layout.model?.target;
    return isModel2D(model) ? model.objects[object] : undefined;
  };

  const plainObject = (object: Scene.StoredObject2D | undefined): Scene.Object2D | undefined => {
    if (!object) {
      return undefined;
    }
    const { parts, ...rest } = object;
    const target = parts?.target;
    return { ...plain(rest), ...(isLayout2D(target) ? { parts: target.key } : {}) };
  };

  const write = (views: ViewMap, previous: ViewMap = {}, decorate: DecorateLayout = (record) => record) => {
    const placed: Scene.Object2D[] = [];
    const written: Array<{ layout: Scene.Layout2D; view: View; record: Scene.LayoutRecord2D }> = [];
    for (const view of Object.values(views)) {
      if (previous[view.id] === view) {
        continue;
      }
      const { layout: record, objects } = fromCanvasView(view);
      placed.push(...objects);
      written.push({ layout: layoutFor(view), view, record: decorate(record) });
    }
    // A composite View no node places (a definition in the library) is reached through an object of its own.
    const parts = new Set(placed.flatMap((object) => (object.parts ? [object.parts] : [])));
    const reachedBy = (key: string) =>
      parts.has(key) ||
      [...models.values()].some((model) =>
        Object.values(model.objects).some((object) => object.parts?.target === layouts.get(key)),
      );
    for (const { view } of written) {
      if (view.id !== root && !reachedBy(view.id)) {
        placed.push({ id: `${COMPOSITE_PREFIX}${view.id}`, type: 'rect', parts: view.id });
      }
    }
    const model = placed.length > 0 ? rootModel() : undefined;
    if (model) {
      const missing = placed.filter((object) => !same(plainObject(model.objects[object.id]), object));
      if (missing.length > 0) {
        Obj.update(model, (model) => {
          for (const object of missing) {
            const { parts, ...rest } = plain(object);
            const target = parts === undefined ? undefined : layouts.get(parts);
            model.objects[object.id] = target ? { ...rest, parts: Ref.make(target) } : rest;
          }
        });
      }
    }
    for (const { layout, view, record } of written) {
      // A parts layout places objects of the root's model, so it reads them as the root does.
      if (model && layout.model === undefined && Object.values(record.elements).some((element) => element.object)) {
        Obj.update(layout, (layout) => {
          layout.model = Ref.make(model);
        });
      }
      writeLayout(layout, view, previous[view.id], record, objectOf(layout));
    }
    // A View the store let go of (its portal deleted, say) goes with the objects that showed it.
    const removed = Object.keys(previous).filter((id) => !(id in views) && id !== root);
    for (const id of removed) {
      const layout = layouts.get(id);
      if (!layout) {
        continue;
      }
      for (const owner of models.values()) {
        const showing = Object.entries(owner.objects).filter(([, object]) => object.parts?.target === layout);
        showing.length > 0 &&
          Obj.update(owner, (owner) => {
            for (const [objectId] of showing) {
              delete owner.objects[objectId];
            }
          });
      }
      canvas &&
        Obj.update(canvas, (canvas) => {
          const index = canvas.layouts.findIndex((ref) => ref.target === layout);
          index >= 0 && canvas.layouts.splice(index, 1);
        });
      layouts.delete(id);
      db?.remove(layout);
    }
  };

  track();
  return { root, layouts, models, track, write };
};
