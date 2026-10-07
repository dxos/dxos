//
// Copyright 2026 DXOS.org
//

//
// Binds a `Drawing.Canvas` to the engine's `SceneStore`: the store's atom is fed from the canvas
// records and every store write goes back as record-level changes inside one `Obj.update`, so the
// view stays the memory store's client and ECHO merges edits element by element.
//
// A scene shape with a `drawing` shows that drawing: that drawing's canvas is bound alongside, its
// scenes join the store under ids prefixed with the drawing's URI, the shape opens its root, and edits
// inside it are written to that drawing. Only this drawing's own links are followed (a linked drawing's
// links show their local scenes), so a reference cannot cycle.
//

import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type Database, Entity, Obj } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  type Node,
  type PortalNode,
  type Scene,
  type SceneId,
  type SceneMap,
  type SceneStore,
  createMemoryStore,
  isPortalNode,
} from '@dxos/react-ui-canvas/scene';

import { Canvas } from '#types';

import {
  clone,
  hasLegacyRoot,
  isNodeRecord,
  migrateContent,
  nodeKey,
  readScenes,
  rootOf,
  seedContent,
  writeScenes,
} from './content.ts';
import { UNTITLED_DRAWING, drawingUri, linkedSceneId, parseLinkedSceneId } from './scene-node.ts';

export type BoundCanvasStore = {
  store: SceneStore;
  root: SceneId;
  dispose: () => void;
};

/** A drawing a scene shape references, bound for as long as this drawing is. */
type LinkedCanvas = { canvas: Drawing.Canvas; root: SceneId; name?: string; dispose: () => void };

/** Renames, seeds and returns the canvas's root scene, writing only when the content needs it. */
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
  return root ?? seedContent({});
};

const withScene = (node: PortalNode, scene: SceneId): PortalNode => ({ ...node, scene });

const mapNodes = (scene: Scene, map: (node: Node) => Node): Scene => ({
  ...scene,
  nodes: Object.fromEntries(Object.entries(scene.nodes).map(([id, node]) => [id, map(node)])),
});

export const bindCanvasStore = (registry: Registry.AtomRegistry, canvas: Drawing.Canvas): BoundCanvasStore => {
  const root = prepare(canvas);
  const db: Database.Database | undefined = Obj.getDatabase(canvas);
  const linked = new Map<string, LinkedCanvas>();
  const loading = new Set<string>();
  let disposed = false;

  /** The store's scenes: this drawing's, with linked shapes opening their drawing's root, plus each linked drawing's. */
  const read = (): SceneMap => {
    const scenes: Record<SceneId, Scene> = {};
    for (const scene of Object.values(readScenes(clone(canvas.content)))) {
      scenes[scene.id] = mapNodes(scene, (node) => {
        const uri = isPortalNode(node) ? drawingUri(node) : undefined;
        if (!uri || !isPortalNode(node)) {
          return node;
        }
        ensure(uri);
        // The form edits the reference as a live `Ref`; writes store it in its encoded form again.
        const drawing = db?.makeRef(uri);
        const link = linked.get(uri);
        return { ...(link ? withScene(node, linkedSceneId(uri, link.root)) : node), ...(drawing ? { drawing } : {}) };
      });
    }
    for (const [uri, link] of linked) {
      for (const scene of Object.values(readScenes(clone(link.canvas.content)))) {
        const id = linkedSceneId(uri, scene.id);
        scenes[id] = {
          ...mapNodes(scene, (node) => (isPortalNode(node) ? withScene(node, linkedSceneId(uri, node.scene)) : node)),
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
        // A linked shape keeps its own child scene's id in the record, under the drawing it shows.
        own[id] = mapNodes(scene, (node) => {
          if (!isPortalNode(node) || !parseLinkedSceneId(node.scene)) {
            return node;
          }
          const record = canvas.content[nodeKey(node.id)];
          const local = isNodeRecord(record) && isPortalNode(record.node) ? record.node.scene : node.id;
          return withScene(node, local);
        });
        continue;
      }
      const unprefixed = mapNodes(scene, (node) =>
        isPortalNode(node) ? withScene(node, parseLinkedSceneId(node.scene)?.scene ?? node.scene) : node,
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

  const store = createMemoryStore(Object.values(read()));

  // Our own writes notify ECHO synchronously; the flag keeps them from bouncing back into the atom.
  let writing = false;
  const refresh = () => {
    if (!writing && !disposed) {
      registry.set(store.scenes, read());
    }
  };

  /** Binds the drawing `uri` names once, when a shape first references it; this drawing itself is never bound. */
  function ensure(uri: URI.URI) {
    if (!db || linked.has(uri) || loading.has(uri)) {
      return;
    }
    loading.add(uri);
    // ECHO loads references as promises: this is the boundary where the async load meets the sync store.
    void db
      .makeRef<Drawing.Drawing>(uri)
      .load()
      .then(async (drawing) => {
        const target = await drawing.canvas.load();
        if (disposed || target === canvas || target.schema !== Canvas.SCENE_SCHEMA) {
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
        // An unresolvable reference leaves the shape on its own child scene.
      })
      .finally(() => loading.delete(uri));
  }

  const unsubscribeCanvas = Obj.subscribe(canvas, refresh);
  const unsubscribeStore = registry.subscribe(store.scenes, (scenes) => {
    writing = true;
    try {
      write(scenes);
    } finally {
      writing = false;
    }
  });

  return {
    store,
    root,
    dispose: () => {
      disposed = true;
      unsubscribeCanvas();
      unsubscribeStore();
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
