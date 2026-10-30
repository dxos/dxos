//
// Copyright 2026 DXOS.org
//

//
// Binds a `Drawing.Canvas` to the engine's `ViewStore`: the store's atom is fed from the canvas
// records and every store write goes back as record-level changes inside one `Obj.update`, so the
// view stays the memory store's client and ECHO merges edits element by element.
//
// A frame whose `link.object` is a canvas drawing shows that drawing: that drawing's canvas is bound alongside,
// its scenes join the store under ids prefixed with the drawing's URI, the frame opens its root, and edits
// inside it are written to that drawing. A linked drawing's own links are followed the same way, so a drawing
// opens drawings to any depth; each is bound once by its URI, so a reference cycle shows a scene already bound
// rather than binding again. Any other object is left to the frame's view.
//
// The store's versions (VIEWS.md §8.4) are its drawings' Automerge heads: undo reads a path back as the store showed it
// at those heads, so an entry holds heads and paths, never values.
//

import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type Database, Entity, Obj } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  type VersionedSource,
  type View,
  type ViewMap,
  type ViewStore,
  createMemoryStore,
  readPath,
  storeVersions,
} from '@dxos/react-ui-canvas/headless';
import { type Node, type ViewId, type ViewNode, isViewNode, withLegacyNodeType } from '@dxos/scene';

import { Canvas } from '#types';

import {
  type CanvasRecord,
  clone,
  hasLegacyRoot,
  hasUnplacedLayers,
  isNodeRecord,
  migrateContent,
  migrateLayers,
  nodeKey,
  orphanedViews,
  pruneOrphanedViews,
  readStyles,
  readViews,
  rootOf,
  seedContent,
  updateCanvasRecord,
  writeStyles,
  writeViews,
} from './content.ts';
import { UNTITLED_DRAWING, isSceneCanvas, linkedViewId, objectUri, parseLinkedViewId } from './view-node.ts';

export type BoundCanvasStore = {
  store: ViewStore;
  root: ViewId;
  dispose: () => void;
};

/** A drawing a frame references, bound for as long as this drawing is. */
type LinkedCanvas = { canvas: Drawing.Canvas; root: ViewId; name?: string; dispose: () => void };

/** Renames, seeds and returns the canvas's root scene and names its layers, writing only when the content needs it. */
const prepare = (canvas: Drawing.Canvas): ViewId => {
  if (hasLegacyRoot(canvas.content)) {
    Obj.update(canvas, (canvas) => {
      migrateContent(canvas.content);
    });
  }
  let root = rootOf(canvas.content);
  if (root === undefined) {
    Obj.update(canvas, (canvas) => {
      root = seedContent(canvas.content);
    });
  }
  if (hasUnplacedLayers(canvas.content)) {
    Obj.update(canvas, (canvas) => {
      migrateLayers(canvas.content);
    });
  }
  if (orphanedViews(canvas.content).length > 0) {
    Obj.update(canvas, (canvas) => {
      pruneOrphanedViews(canvas.content);
    });
  }
  return root ?? seedContent({});
};

const withScene = (node: ViewNode, scene: ViewId): ViewNode => ({ ...node, scene });

/** The child View a stored view node opens, read through the legacy type names it may be saved under. */
const storedChild = (record: unknown): ViewId | undefined => {
  if (!isNodeRecord(record)) {
    return undefined;
  }
  const node = withLegacyNodeType(record.node);
  return isViewNode(node) ? node.scene : undefined;
};

/** Each bound drawing's Automerge heads, keyed by its URI (this drawing's under `''`). */
export type CanvasHeads = Readonly<Record<string, readonly string[]>>;

const OWN = '';

/** Heads read back recently; an undo reads many paths at the same two. */
const HEADS_CACHE = 4;

export const isCanvasHeads = (value: unknown): value is CanvasHeads =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((heads) => Array.isArray(heads) && heads.every((head) => typeof head === 'string'));

const mapNodes = (scene: View, map: (node: Node) => Node): View => ({
  ...scene,
  nodes: Object.fromEntries(Object.entries(scene.nodes).map(([id, node]) => [id, map(node)])),
});

/** A binding and the registry its atoms live in. */
export type LiveCanvasStore = { registry: Registry.AtomRegistry; bound: BoundCanvasStore };

/** The bindings open now, by canvas id, so an operation patches the store a view shows rather than binding again. */
const live = new Map<string, Set<LiveCanvasStore>>();

/** The latest open binding of the canvas `id`, if a view has one. */
export const liveCanvasStore = (id: string): LiveCanvasStore | undefined => [...(live.get(id) ?? [])].at(-1);

export const bindCanvasStore = (registry: Registry.AtomRegistry, canvas: Drawing.Canvas): BoundCanvasStore => {
  const root = prepare(canvas);
  const db: Database.Database | undefined = Obj.getDatabase(canvas);
  const linked = new Map<string, LinkedCanvas>();
  const loading = new Set<string>();
  // Objects that are not canvas drawings (or this drawing itself): loaded once, never bound.
  const unlinked = new Set<string>();
  let disposed = false;

  /**
   * The store's scenes: this drawing's, with linked frames opening their drawing's root, plus each linked drawing's;
   * `contentOf` reads a drawing's content now or at earlier heads.
   */
  const read = (
    contentOf: (canvas: Drawing.Canvas, key: string) => Drawing.Canvas['content'] | undefined = (canvas) =>
      canvas.content,
  ): ViewMap => {
    const scenes: Record<ViewId, View> = {};
    for (const scene of Object.values(readViews(clone(contentOf(canvas, OWN) ?? {})))) {
      scenes[scene.id] = mapNodes(scene, (node) => {
        const uri = isViewNode(node) ? objectUri(node) : undefined;
        if (!uri || !isViewNode(node)) {
          return node;
        }
        ensure(uri);
        // The form and the frame's view read the reference as a live `Ref`; writes store it encoded again.
        const object = db?.makeRef(uri);
        const link = linked.get(uri);
        return {
          ...(link ? withScene(node, linkedViewId(uri, link.root)) : node),
          ...(object ? { link: { ...node.link, object } } : {}),
        };
      });
    }
    for (const [uri, link] of linked) {
      for (const scene of Object.values(readViews(clone(contentOf(link.canvas, uri) ?? {})))) {
        const id = linkedViewId(uri, scene.id);
        scenes[id] = {
          ...mapNodes(scene, (node) => {
            if (!isViewNode(node)) {
              return node;
            }
            // A frame of a linked drawing that shows another drawing opens that drawing's root, as one here does.
            const child = objectUri(node);
            if (child) {
              ensure(child);
            }
            const childLink = child ? linked.get(child) : undefined;
            return withScene(
              node,
              child && childLink ? linkedViewId(child, childLink.root) : linkedViewId(uri, node.scene),
            );
          }),
          id,
          // An unnamed root reads as the drawing it belongs to, not its prefixed id.
          name: scene.name ?? (scene.id === link.root ? link.name : undefined),
        };
      }
    }
    return scenes;
  };

  /** Writes each scene to the drawing it came from, undoing the prefixes `read` added. */
  const write = (scenes: ViewMap) => {
    const own: Record<ViewId, View> = {};
    const byUri = new Map<string, Record<ViewId, View>>();
    for (const [id, scene] of Object.entries(scenes)) {
      const parsed = parseLinkedViewId(id);
      if (!parsed) {
        // A linked frame keeps its own child scene's id in the record, under the drawing it shows.
        own[id] = mapNodes(scene, (node) => {
          if (!isViewNode(node) || !parseLinkedViewId(node.scene)) {
            return node;
          }
          const record = canvas.content[nodeKey(node.id)];
          return withScene(node, storedChild(record) ?? node.id);
        });
        continue;
      }
      const content = linked.get(parsed.uri)?.canvas.content;
      const unprefixed = mapNodes(scene, (node) => {
        if (!isViewNode(node)) {
          return node;
        }
        const target = parseLinkedViewId(node.scene);
        // A frame opening another drawing keeps its own child scene's id in the record, as one here does.
        if (target && target.uri !== parsed.uri) {
          const record = content?.[nodeKey(node.id)];
          return withScene(node, storedChild(record) ?? node.id);
        }
        return withScene(node, target?.scene ?? node.scene);
      });
      byUri.set(parsed.uri, { ...byUri.get(parsed.uri), [parsed.scene]: { ...unprefixed, id: parsed.scene } });
    }
    Obj.update(canvas, (canvas) => {
      writeViews(canvas.content, own);
    });
    for (const [uri, linkedScenes] of byUri) {
      const link = linked.get(uri);
      if (link) {
        Obj.update(link.canvas, (canvas) => {
          writeViews(canvas.content, linkedScenes);
        });
      }
    }
  };

  // A linked drawing's classes stay its own: its shapes show here without them.
  const memory = createMemoryStore(Object.values(read()), readStyles(canvas.styles));
  const { styles } = memory;
  const current = storeVersions(registry, memory);
  const headsOf = (target: Drawing.Canvas): readonly string[] => [...(Obj.version(target).automergeHeads ?? [])];
  const cache = new Map<string, ViewMap>();
  /** The store as it read at `heads`; a drawing bound since then reads as it is now. */
  const readAt = (heads: CanvasHeads): ViewMap => {
    const key = JSON.stringify(heads);
    let views = cache.get(key);
    if (!views) {
      views = read((target, uri) => {
        const at = heads[uri];
        return at && at.length > 0 ? Obj.getVersion(target, at).content : target.content;
      });
      cache.set(key, views);
      if (cache.size > HEADS_CACHE) {
        cache.delete(cache.keys().next().value ?? key);
      }
    }
    return views;
  };
  // Without a database the canvas has no history, so the atom's snapshots stand in, as for the memory store.
  const versions: VersionedSource | undefined = db
    ? {
        heads: (): CanvasHeads => ({
          [OWN]: headsOf(canvas),
          ...Object.fromEntries([...linked].map(([uri, link]) => [uri, headsOf(link.canvas)])),
        }),
        read: (path, heads) =>
          heads === undefined ? current.read(path) : isCanvasHeads(heads) ? readPath(readAt(heads), path) : undefined,
        write: current.write,
      }
    : undefined;

  // A linked drawing's root is kept with no frame opening it: deleting the frame here must not delete that drawing.
  const store: ViewStore = {
    ...memory,
    ...(versions ? { versions } : {}),
    isRoot: (id) => {
      const parsed = parseLinkedViewId(id);
      return parsed !== undefined && linked.get(parsed.uri)?.root === parsed.scene;
    },
  };

  // Our own writes notify ECHO synchronously; the flag keeps them from bouncing back into the atom.
  let writing = false;
  // Classes read from the canvas are not written back to it.
  let reading = false;
  const refresh = () => {
    if (!writing && !disposed) {
      registry.set(store.views, read());
      const next = readStyles(canvas.styles);
      if (JSON.stringify(next) !== JSON.stringify(registry.get(styles))) {
        reading = true;
        try {
          registry.set(styles, next);
        } finally {
          reading = false;
        }
      }
    }
  };

  /** Binds the canvas drawing `uri` names once, when a frame first references it; this drawing itself is never bound. */
  function ensure(uri: URI.URI) {
    if (!db || linked.has(uri) || loading.has(uri) || unlinked.has(uri)) {
      return;
    }
    loading.add(uri);
    // ECHO loads references as promises: this is the boundary where the async load meets the sync store.
    void db
      .makeRef(uri)
      .load()
      .then(async (drawing) => {
        if (!Obj.instanceOf(Drawing.Drawing, drawing)) {
          unlinked.add(uri);
          return;
        }
        const target = await drawing.canvas.load();
        if (target === canvas || !isSceneCanvas(target)) {
          unlinked.add(uri);
          return;
        }
        if (disposed) {
          return;
        }
        const linkedRoot = prepare(target);
        linked.set(uri, {
          canvas: target,
          root: linkedRoot,
          name: Entity.getLabel(drawing) ?? UNTITLED_DRAWING,
          dispose: Obj.subscribe(target, refresh),
        });
        refresh();
      })
      .catch(() => {
        // An unresolvable reference leaves the frame on its own child scene.
      })
      .finally(() => loading.delete(uri));
  }

  const unsubscribeCanvas = Obj.subscribe(canvas, refresh);
  // Built before subscribing: an atom announces its first value when first read (in a render), and a subscriber would
  // write that value straight back to the canvas, updating its readers mid-render.
  registry.get(styles);
  registry.get(store.views);
  const unsubscribeStyles = registry.subscribe(styles, (next) => {
    if (reading) {
      return;
    }
    writing = true;
    try {
      Obj.update(canvas, (canvas) => {
        canvas.styles ??= {};
        writeStyles(canvas.styles, next);
      });
    } finally {
      writing = false;
    }
  });
  /**
   * Whether a frame's object and the scene it opens disagree after an edit (the picker changed or cleared the object),
   * so the store must read again; a drawing not yet bound is loaded, and its load reads again itself.
   */
  const stale = (scenes: ViewMap): boolean => {
    let result = false;
    for (const [id, scene] of Object.entries(scenes)) {
      // Frames in a linked drawing are checked too: `read` resolves their objects the same way as this drawing's.
      const owner = parseLinkedViewId(id)?.uri;
      for (const node of Object.values(scene.nodes)) {
        if (!isViewNode(node)) {
          continue;
        }
        const uri = objectUri(node);
        if (uri) {
          ensure(uri);
        }
        const link = uri ? linked.get(uri) : undefined;
        // Without a bound drawing a frame opens its own child scene, which belongs to the frame's own drawing.
        result ||=
          uri && link ? node.scene !== linkedViewId(uri, link.root) : parseLinkedViewId(node.scene)?.uri !== owner;
      }
    }
    return result;
  };

  const unsubscribeStore = registry.subscribe(store.views, (scenes) => {
    writing = true;
    try {
      write(scenes);
    } finally {
      writing = false;
    }
    // After the write settles, not within it: the read sets the atom this subscriber is reacting to.
    if (stale(scenes)) {
      queueMicrotask(refresh);
    }
  });

  const bound: BoundCanvasStore = {
    store,
    root,
    dispose: () => {
      disposed = true;
      live.get(canvas.id)?.delete(entry);
      unsubscribeCanvas();
      unsubscribeStore();
      unsubscribeStyles();
      for (const link of linked.values()) {
        link.dispose();
      }
    },
  };
  const entry: LiveCanvasStore = { registry, bound };
  live.set(canvas.id, (live.get(canvas.id) ?? new Set()).add(entry));
  return bound;
};

/** A fresh canvas for the variant: the root scene with the drawing's `settings`, and nothing else. */
export const createCanvas = (settings: Partial<Omit<CanvasRecord, 'kind' | 'root'>> = {}): Drawing.Canvas => {
  const content = {};
  seedContent(content);
  updateCanvasRecord(content, settings);
  return Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content });
};
