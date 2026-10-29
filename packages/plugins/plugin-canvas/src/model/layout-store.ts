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

import { type Database, Obj } from '@dxos/echo';
import {
  type VersionedSource,
  type ViewId,
  type ViewMap,
  type ViewStore,
  createMemoryStore,
  readPath,
  storeVersions,
} from '@dxos/react-ui-canvas/headless';
import { toCanvasView } from '@dxos/react-ui-scene/canvas';
import { type Scene, fromEcho } from '@dxos/scene';

import { type Canvas } from '#types';

import { readStyles } from './content.ts';
import { isLayout2D, isModel2D, makeLayoutWriter, plain, same } from './layout-writer.ts';

export type BoundLayoutStore = {
  store: ViewStore;
  root: ViewId;
  /** The open scene's camera; a change is written to the scene once it has settled for {@link CAMERA_SETTLE}. */
  camera: Atom.Writable<Scene.Camera2D>;
  dispose: () => void;
};

/** How long the camera must rest before it is written to the scene, so a pan is one change rather than hundreds. */
export const CAMERA_SETTLE = 500;

/** Each layout's and model's Automerge heads, by `layout:<key>` and `model:<key>`, since a layout and a model may share a key. */
export type LayoutHeads = Readonly<Record<string, readonly string[]>>;

const headsKey = (object: Obj.Any & { key: string }): string =>
  `${isLayout2D(object) ? 'layout' : 'model'}:${object.key}`;

const isLayoutHeads = (value: unknown): value is LayoutHeads =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((heads) => Array.isArray(heads) && heads.every((head) => typeof head === 'string'));

/**
 * Binds `scene` to a store: one View per 2D layout it reaches, the scene's layout first. A new View (a Group, say) is
 * written as a new Layout2D; a composite object a write places goes to the root layout's model, made if it has none.
 */
export type BindLayoutStoreOptions = {
  /** The canvas the scene belongs to: its style classes are the store's, and operations find the store by it. */
  canvas?: Canvas.Canvas;
};

/** A binding and the registry its atoms live in. */
export type LiveLayoutStore = { registry: Registry.AtomRegistry; bound: BoundLayoutStore };

/** The bindings open now, by canvas id, so an operation edits the store a view shows rather than binding again. */
const live = new Map<string, Set<LiveLayoutStore>>();

/** The latest open binding of the canvas `id`, if a view has one. */
export const liveLayoutStore = (id: string): LiveLayoutStore | undefined => [...(live.get(id) ?? [])].at(-1);

export const bindLayoutStore = (
  registry: Registry.AtomRegistry,
  scene: Scene.Scene2D,
  { canvas }: BindLayoutStoreOptions = {},
): BoundLayoutStore => {
  const db: Database.Database | undefined = Obj.getDatabase(scene);
  const writer = makeLayoutWriter(scene, { canvas });
  const { root, layouts, models } = writer;
  let disposed = false;
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
      const version = heads[headsKey(object)];
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

  const memory = createMemoryStore(Object.values(read()), readStyles(canvas?.styles), { root });
  const current = storeVersions(registry, memory);
  const headsOf = (object: Obj.Any): readonly string[] => [...(Obj.version(object).automergeHeads ?? [])];
  // Without a database the layouts have no history, so the atom's snapshots stand in, as for the memory store.
  const versions: VersionedSource | undefined = db
    ? {
        heads: (): LayoutHeads =>
          Object.fromEntries(
            [...layouts.values(), ...models.values()].map((object) => [headsKey(object), headsOf(object)]),
          ),
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
    const reached = writer.track();
    for (const object of reached) {
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

  /** What the store showed before the latest write, so a write changes only the elements that changed. */
  let last: ViewMap = registry.get(memory.views);

  track();
  const unsubscribeStore = registry.subscribe(store.views, (views) => {
    if (reading) {
      last = views;
      return;
    }
    writing = true;
    try {
      writer.write(views, last);
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

  // The canvas's style classes, both ways; classes read from the canvas are not written back to it.
  let readingStyles = false;
  const unsubscribeStyles = canvas
    ? registry.subscribe(memory.styles, (next) => {
        if (!readingStyles && !same(canvas.styles ?? {}, next)) {
          Obj.update(canvas, (canvas) => {
            canvas.styles = plain(next);
          });
        }
      })
    : undefined;
  const unsubscribeCanvas = canvas
    ? Obj.subscribe(canvas, () => {
        const next = readStyles(canvas.styles);
        if (!same(next, registry.get(memory.styles))) {
          readingStyles = true;
          try {
            registry.set(memory.styles, next);
          } finally {
            readingStyles = false;
          }
        }
      })
    : undefined;

  const bound: BoundLayoutStore = {
    store,
    root,
    camera,
    dispose: () => {
      disposed = true;
      canvas && live.get(canvas.id)?.delete(entry);
      unsubscribeStyles?.();
      unsubscribeCanvas?.();
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
  const entry: LiveLayoutStore = { registry, bound };
  canvas && live.set(canvas.id, (live.get(canvas.id) ?? new Set()).add(entry));
  return bound;
};
