//
// Copyright 2026 DXOS.org
//

//
// Binds a Scene2D to the engine's `ViewStore`: each 2D layout the scene reaches is one View (its id is the layout's
// `key`), the scene's own layout is the root, and every store write goes back as element-level changes to the layout
// that owns the element, so ECHO merges concurrent edits element by element. The camera is the scene's, written back
// once it settles. Undo reads the store's past at the layouts' Automerge heads.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import type * as Types from 'effect/Types';

import { type Database, Obj, Ref } from '@dxos/echo';
import {
  type VersionedSource,
  type View,
  type ViewId,
  type ViewMap,
  type ViewStore,
  createMemoryStore,
  readPath,
  storeVersions,
} from '@dxos/react-ui-canvas/headless';
import { fromCanvasView, toCanvasView } from '@dxos/react-ui-scene/canvas';
import { Scene, fromEcho, reachedObjects } from '@dxos/scene';

export type BoundLayoutStore = {
  store: ViewStore;
  root: ViewId;
  /** The open scene's camera; a change is written to the scene once it has settled for {@link CAMERA_SETTLE}. */
  camera: Atom.Writable<Scene.Camera2D>;
  dispose: () => void;
};

/** How long the camera must rest before it is written to the scene, so a pan is one change rather than hundreds. */
export const CAMERA_SETTLE = 500;

/** Each layout's and model's Automerge heads, by its `key`. */
export type LayoutHeads = Readonly<Record<string, readonly string[]>>;

const isLayoutHeads = (value: unknown): value is LayoutHeads =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((heads) => Array.isArray(heads) && heads.every((head) => typeof head === 'string'));

/** A deep copy free of ECHO proxies, writable as a new record of an object. */
const plain = <T>(value: T): Types.DeepMutable<T> => JSON.parse(JSON.stringify(value));

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const isLayout2D = (value: unknown): value is Scene.Layout2D => Obj.instanceOf(Scene.Layout2D, value);
const isModel2D = (value: unknown): value is Scene.Model2D => Obj.instanceOf(Scene.Model2D, value);

/** An element placing `object` without the size and style values it would read from the object anyway. */
const overObject = (
  element: Types.DeepMutable<Scene.Element2D>,
  object: Scene.StoredObject2D,
): Types.DeepMutable<Scene.Element2D> => {
  const { size, style, ...rest } = element;
  const ownStyle = Object.fromEntries(
    Object.entries(style ?? {}).filter(([key, value]) => !same(value, Reflect.get(object.style ?? {}, key))),
  );
  return {
    ...rest,
    ...(size && !same(size, object.size) ? { size } : {}),
    ...(Object.keys(ownStyle).length > 0 ? { style: ownStyle } : {}),
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
      const { kind, ...element } = plain(record.elements[id]);
      const placed = layout.elements[id]?.object;
      const object = placed === undefined ? undefined : objectOf(placed);
      layout.elements[id] =
        placed !== undefined && object && element.object === undefined && kind === object.kind
          ? overObject({ ...element, object: placed }, object)
          : { ...element, ...(kind === undefined ? {} : { kind }) };
    }
    for (const id of remove) {
      delete layout.elements[id];
    }
    if (fieldsChanged) {
      if (layout.name !== record.name) {
        layout.name = record.name;
      }
      if (!same(layout.props, record.props)) {
        layout.props = record.props === undefined ? undefined : plain(record.props);
      }
    }
  });
};

/**
 * Binds `scene` to a store: one View per 2D layout it reaches, the scene's layout first. A new View (a Group, say) is
 * written as a new Layout2D; a composite object a write places goes to the root layout's model, made if it has none.
 */
export const bindLayoutStore = (registry: Registry.AtomRegistry, scene: Scene.Scene2D): BoundLayoutStore => {
  const db: Database.Database | undefined = Obj.getDatabase(scene);
  const root: ViewId = scene.layout.target?.key ?? scene.key;
  let disposed = false;

  /** The 2D layouts and models the scene reaches now, by key; layouts made for new Views join on their first write. */
  const layouts = new Map<string, Scene.Layout2D>();
  const models = new Map<string, Scene.Model2D>();
  const subscriptions = new Map<Obj.Any, () => void>();

  const read = (): ViewMap => {
    const doc = fromEcho(scene);
    return Object.fromEntries(
      doc.layouts.flatMap((layout) => (layout.dim === '2d' ? [[layout.id, toCanvasView(doc, layout)]] : [])),
    );
  };

  /** The store as it read at `heads`: each layout and model at its heads, or as it is now when it has none there. */
  const readAt = (heads: LayoutHeads): ViewMap => {
    const at = <T extends Obj.Any & { key: string }>(object: T): T | Obj.Snapshot<T> => {
      const version = heads[object.key];
      return version && version.length > 0 ? Obj.getVersion(object, version) : object;
    };
    const doc: Scene.SceneDocument = {
      scenes: [],
      layouts: [...layouts.values()].map((layout) => {
        const past = at(layout);
        const model = layout.model?.target;
        return {
          id: layout.key,
          dim: '2d',
          ...(past.name === undefined ? {} : { name: past.name }),
          ...(isModel2D(model) ? { model: model.key } : {}),
          elements: plain({ ...past.elements }),
          ...(past.props === undefined ? {} : { props: plain({ ...past.props }) }),
        };
      }),
      // Parts are Refs, so a model's past objects name their parts by the layouts they point at now.
      models: [...models.values()].map((model) => ({
        id: model.key,
        dim: '2d',
        objects: Object.fromEntries(
          Object.entries(at(model).objects).map(([id, object]) => {
            const { parts, ...rest } = object;
            const target = parts?.target;
            return [id, { ...plain(rest), ...(isLayout2D(target) ? { parts: target.key } : {}) }];
          }),
        ),
      })),
    };
    return Object.fromEntries(
      doc.layouts.flatMap((layout) => (layout.dim === '2d' ? [[layout.id, toCanvasView(doc, layout)]] : [])),
    );
  };

  const memory = createMemoryStore(Object.values(read()), {}, { root });
  const current = storeVersions(registry, memory);
  const headsOf = (object: Obj.Any): readonly string[] => [...(Obj.version(object).automergeHeads ?? [])];
  // Without a database the layouts have no history, so the atom's snapshots stand in, as for the memory store.
  const versions: VersionedSource | undefined = db
    ? {
        heads: (): LayoutHeads =>
          Object.fromEntries([...layouts.values(), ...models.values()].map((object) => [object.key, headsOf(object)])),
        read: (path, heads) =>
          heads === undefined ? current.read(path) : isLayoutHeads(heads) ? readPath(readAt(heads), path) : undefined,
        write: current.write,
      }
    : undefined;
  const store: ViewStore = { ...memory, ...(versions ? { versions } : {}) };

  // Our own writes notify ECHO synchronously; the flag keeps them from bouncing back into the atom.
  let writing = false;
  // A read from ECHO is not written back.
  let reading = false;
  const refresh = () => {
    if (!writing && !disposed) {
      track();
      reading = true;
      try {
        registry.set(store.views, read());
      } finally {
        reading = false;
      }
    }
  };

  /** Subscribes to every object the scene reaches now, and to no other. */
  const track = () => {
    const reached = new Set(reachedObjects(scene));
    layouts.clear();
    models.clear();
    for (const object of reached) {
      isLayout2D(object) && layouts.set(object.key, object);
      isModel2D(object) && models.set(object.key, object);
      if (!subscriptions.has(object)) {
        subscriptions.set(object, Obj.subscribe(object, refresh));
      }
    }
    for (const [object, unsubscribe] of subscriptions) {
      if (!reached.has(object)) {
        unsubscribe();
        subscriptions.delete(object);
      }
    }
  };

  /** The root layout's model, made and attached when a write first places an object. */
  const rootModel = (): Scene.Model2D | undefined => {
    const layout = layouts.get(root);
    const existing = layout?.model?.target;
    if (isModel2D(existing) || !layout) {
      return isModel2D(existing) ? existing : undefined;
    }
    const model = Obj.make(Scene.Model2D, { key: `${root}:model`, objects: {} });
    db?.add(model);
    Obj.update(layout, (layout) => {
      layout.model = Ref.make(model);
    });
    return model;
  };

  const layoutFor = (view: View): Scene.Layout2D => {
    const existing = layouts.get(view.id);
    if (existing) {
      return existing;
    }
    const layout = Obj.make(Scene.Layout2D, { key: view.id, elements: {} });
    db?.add(layout);
    layouts.set(view.id, layout);
    return layout;
  };

  /** What the store showed before the latest write, so a write changes only the elements that changed. */
  let last: ViewMap = registry.get(memory.views);

  const objectOf = (layout: Scene.Layout2D) => (object: string) => {
    const model = layout.model?.target;
    return isModel2D(model) ? model.objects[object] : undefined;
  };

  const write = (views: ViewMap) => {
    const placed: Scene.Object2D[] = [];
    const written: Array<{ layout: Scene.Layout2D; view: View; record: Scene.LayoutRecord2D }> = [];
    for (const view of Object.values(views)) {
      if (last[view.id] === view) {
        continue;
      }
      const { layout: record, objects } = fromCanvasView(view);
      placed.push(...objects);
      written.push({ layout: layoutFor(view), view, record });
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
      writeLayout(layout, view, last[view.id], record, objectOf(layout));
    }
  };

  const plainObject = (object: Scene.StoredObject2D | undefined): Scene.Object2D | undefined => {
    if (!object) {
      return undefined;
    }
    const { parts, ...rest } = object;
    const target = parts?.target;
    return { ...plain(rest), ...(isLayout2D(target) ? { parts: target.key } : {}) };
  };

  track();
  const unsubscribeStore = registry.subscribe(store.views, (views) => {
    if (reading) {
      last = views;
      return;
    }
    writing = true;
    try {
      write(views);
    } finally {
      writing = false;
      last = views;
    }
    // A write that made a layout or model reaches new objects, which must be followed too.
    track();
  });

  const camera = Atom.keepAlive(Atom.make<Scene.Camera2D>(plain(scene.camera)));
  let settle: ReturnType<typeof setTimeout> | undefined;
  let readingCamera = false;
  const unsubscribeCamera = registry.subscribe(camera, (next) => {
    if (readingCamera) {
      return;
    }
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (!disposed && !same(scene.camera, next)) {
        Obj.update(scene, (scene) => {
          scene.camera = next;
        });
      }
    }, CAMERA_SETTLE);
  });
  const unsubscribeScene = Obj.subscribe(scene, () => {
    if (!same(scene.camera, registry.get(camera))) {
      readingCamera = true;
      try {
        registry.set(camera, plain(scene.camera));
      } finally {
        readingCamera = false;
      }
    }
  });

  return {
    store,
    root,
    camera,
    dispose: () => {
      disposed = true;
      clearTimeout(settle);
      unsubscribeStore();
      unsubscribeCamera();
      unsubscribeScene();
      for (const unsubscribe of subscriptions.values()) {
        unsubscribe();
      }
      subscriptions.clear();
    },
  };
};
