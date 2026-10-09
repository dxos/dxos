//
// Copyright 2026 DXOS.org
//

//
// Binds a `Drawing.Canvas` to the engine's `SceneStore`: the store's atom is fed from the canvas
// records and every store write goes back as record-level changes inside one `Obj.update`, so the
// view stays the memory store's client and ECHO merges edits element by element.
//
// A frame whose `object` is a canvas drawing shows that drawing: that drawing's canvas is bound alongside,
// its scenes join the store under ids prefixed with the drawing's URI, the frame opens its root, and edits
// inside it are written to that drawing. Only this drawing's own links are followed (a linked drawing's
// links show their local scenes), so a reference cannot cycle. Any other object is left to the frame's view.
//

import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type Database, Entity, Obj } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  type FrameNode,
  type Node,
  type Scene,
  type SceneId,
  type SceneMap,
  type SceneStore,
  createMemoryStore,
  isFrameNode,
} from '@dxos/react-ui-canvas/scene';

import { Canvas } from '#types';

import {
  clone,
  hasLegacyRoot,
  hasUnplacedLayers,
  isNodeRecord,
  migrateContent,
  migrateLayers,
  nodeKey,
  readScenes,
  readStyles,
  rootOf,
  seedContent,
  writeScenes,
  writeStyles,
} from './content.ts';
import { UNTITLED_DRAWING, isSceneCanvas, linkedSceneId, objectUri, parseLinkedSceneId } from './frame-node.ts';

export type BoundCanvasStore = {
  store: SceneStore;
  root: SceneId;
  dispose: () => void;
};

/** A drawing a frame references, bound for as long as this drawing is. */
type LinkedCanvas = { canvas: Drawing.Canvas; root: SceneId; name?: string; dispose: () => void };

/** Renames, seeds and returns the canvas's root scene and names its layers, writing only when the content needs it. */
const prepare = (canvas: Drawing.Canvas): SceneId => {
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
  return root ?? seedContent({});
};

const withScene = (node: FrameNode, scene: SceneId): FrameNode => ({ ...node, scene });

const mapNodes = (scene: Scene, map: (node: Node) => Node): Scene => ({
  ...scene,
  nodes: Object.fromEntries(Object.entries(scene.nodes).map(([id, node]) => [id, map(node)])),
});

export const bindCanvasStore = (registry: Registry.AtomRegistry, canvas: Drawing.Canvas): BoundCanvasStore => {
  const root = prepare(canvas);
  const db: Database.Database | undefined = Obj.getDatabase(canvas);
  const linked = new Map<string, LinkedCanvas>();
  const loading = new Set<string>();
  // Objects that are not canvas drawings (or this drawing itself): loaded once, never bound.
  const unlinked = new Set<string>();
  let disposed = false;

  /** The store's scenes: this drawing's, with linked frames opening their drawing's root, plus each linked drawing's. */
  const read = (): SceneMap => {
    const scenes: Record<SceneId, Scene> = {};
    for (const scene of Object.values(readScenes(clone(canvas.content)))) {
      scenes[scene.id] = mapNodes(scene, (node) => {
        const uri = isFrameNode(node) ? objectUri(node) : undefined;
        if (!uri || !isFrameNode(node)) {
          return node;
        }
        ensure(uri);
        // The form and the frame's view read the reference as a live `Ref`; writes store it encoded again.
        const object = db?.makeRef(uri);
        const link = linked.get(uri);
        return { ...(link ? withScene(node, linkedSceneId(uri, link.root)) : node), ...(object ? { object } : {}) };
      });
    }
    for (const [uri, link] of linked) {
      for (const scene of Object.values(readScenes(clone(link.canvas.content)))) {
        const id = linkedSceneId(uri, scene.id);
        scenes[id] = {
          ...mapNodes(scene, (node) => (isFrameNode(node) ? withScene(node, linkedSceneId(uri, node.scene)) : node)),
          id,
          // An unnamed root reads as the drawing it belongs to, not its prefixed id.
          name: scene.name ?? (scene.id === link.root ? link.name : undefined),
        };
      }
    }
    return scenes;
  };

  /** Writes each scene to the drawing it came from, undoing the prefixes `read` added. */
  const write = (scenes: SceneMap) => {
    const own: Record<SceneId, Scene> = {};
    const byUri = new Map<string, Record<SceneId, Scene>>();
    for (const [id, scene] of Object.entries(scenes)) {
      const parsed = parseLinkedSceneId(id);
      if (!parsed) {
        // A linked frame keeps its own child scene's id in the record, under the drawing it shows.
        own[id] = mapNodes(scene, (node) => {
          if (!isFrameNode(node) || !parseLinkedSceneId(node.scene)) {
            return node;
          }
          const record = canvas.content[nodeKey(node.id)];
          const local = isNodeRecord(record) && isFrameNode(record.node) ? record.node.scene : node.id;
          return withScene(node, local);
        });
        continue;
      }
      const unprefixed = mapNodes(scene, (node) =>
        isFrameNode(node) ? withScene(node, parseLinkedSceneId(node.scene)?.scene ?? node.scene) : node,
      );
      byUri.set(parsed.uri, { ...byUri.get(parsed.uri), [parsed.scene]: { ...unprefixed, id: parsed.scene } });
    }
    Obj.update(canvas, (canvas) => {
      writeScenes(canvas.content, own);
    });
    for (const [uri, linkedScenes] of byUri) {
      const link = linked.get(uri);
      if (link) {
        Obj.update(link.canvas, (canvas) => {
          writeScenes(canvas.content, linkedScenes);
        });
      }
    }
  };

  // A linked drawing's classes stay its own: its shapes show here without them.
  const store = createMemoryStore(Object.values(read()), readStyles(canvas.styles));
  const { styles } = store;

  // Our own writes notify ECHO synchronously; the flag keeps them from bouncing back into the atom.
  let writing = false;
  // Classes read from the canvas are not written back to it.
  let reading = false;
  const refresh = () => {
    if (!writing && !disposed) {
      registry.set(store.scenes, read());
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
  const stale = (scenes: SceneMap): boolean => {
    let result = false;
    for (const [id, scene] of Object.entries(scenes)) {
      if (parseLinkedSceneId(id)) {
        continue;
      }
      for (const node of Object.values(scene.nodes)) {
        if (!isFrameNode(node)) {
          continue;
        }
        const uri = objectUri(node);
        if (!uri) {
          result ||= parseLinkedSceneId(node.scene) !== undefined;
          continue;
        }
        ensure(uri);
        const link = linked.get(uri);
        result ||= link ? node.scene !== linkedSceneId(uri, link.root) : parseLinkedSceneId(node.scene) !== undefined;
      }
    }
    return result;
  };

  const unsubscribeStore = registry.subscribe(store.scenes, (scenes) => {
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

  return {
    store,
    root,
    dispose: () => {
      disposed = true;
      unsubscribeCanvas();
      unsubscribeStore();
      unsubscribeStyles();
      for (const link of linked.values()) {
        link.dispose();
      }
    },
  };
};

/** A fresh canvas for the variant: the root scene and nothing else. */
export const createCanvas = (): Drawing.Canvas => {
  const content = {};
  seedContent(content);
  return Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content });
};
