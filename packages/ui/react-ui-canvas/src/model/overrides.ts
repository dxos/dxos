//
// Copyright 2026 DXOS.org
//

//
// The time-override seam: another plugin (an animation) derives each frame from the stored drawing by merging
// per-frame, read-only values over it, without writing to the model. It is a store, not a projection, because a
// portal reads its child scene through `store.scene(id)`, so only a store reaches every depth.
//

import * as Atom from 'effect/reactivity/Atom';

import { sceneLayers } from '../utils/layers.ts';
import { type SceneMap, type SceneStore } from './store.ts';
import {
  type LayerId,
  type Link,
  type LinkId,
  type Node,
  type NodeBase,
  type NodeId,
  type Scene,
  type SceneId,
} from './types.ts';

/** What a frame may change on a node; `style` merges over the node's own. */
export type NodeOverride = Partial<Pick<NodeBase, 'center' | 'size' | 'hidden' | 'style'>>;

/** What a frame may change on a link; `style` merges over the link's own. */
export type LinkOverride = Partial<Pick<Link, 'hidden' | 'style'>>;

/** What a frame may change on a layer. */
export type LayerOverride = { hidden?: boolean };

/** One scene's overrides for one frame. */
export type SceneOverride = {
  nodes?: Readonly<Record<NodeId, NodeOverride>>;
  links?: Readonly<Record<LinkId, LinkOverride>>;
  layers?: Readonly<Record<LayerId, LayerOverride>>;
};

/** Every scene's overrides for one frame, by scene id, so objects inside compound objects can be driven too. */
export type SceneOverrides = Readonly<Record<SceneId, SceneOverride>>;

const mergeEntries = <T extends { id: string }, O>(
  record: Readonly<Record<string, T>>,
  overrides: Readonly<Record<string, O>> | undefined,
  merge: (element: T, override: O) => T,
): Readonly<Record<string, T>> => {
  const entries = Object.entries(overrides ?? {}).filter(([id]) => record[id] !== undefined);
  if (entries.length === 0) {
    return record;
  }
  return { ...record, ...Object.fromEntries(entries.map(([id, override]) => [id, merge(record[id], override)])) };
};

const mergeNode = (node: Node, { style, ...rest }: NodeOverride): Node => ({
  ...node,
  ...rest,
  ...(style ? { style: { ...node.style, ...style } } : {}),
});

const mergeLink = (link: Link, { style, ...rest }: LinkOverride): Link => ({
  ...link,
  ...rest,
  ...(style ? { style: { ...link.style, ...style } } : {}),
});

/**
 * The scene with `override` merged over it. The same scene when there is nothing to merge, so a memo over it holds;
 * overrides naming an element or layer the scene does not have are ignored.
 */
export const applyOverrides = (scene: Scene, override: SceneOverride | undefined): Scene => {
  if (!override) {
    return scene;
  }
  const nodes = mergeEntries(scene.nodes, override.nodes, mergeNode);
  const links = mergeEntries(scene.links, override.links, mergeLink);
  // A scene that names no layers has the implicit one, which an override may still hide.
  const layerRecord = Object.fromEntries(sceneLayers(scene).map((layer) => [layer.id, layer]));
  const layers = mergeEntries(layerRecord, override.layers, (layer, values) => ({ ...layer, ...values }));
  if (nodes === scene.nodes && links === scene.links && layers === layerRecord) {
    return scene;
  }
  return { ...scene, nodes, links, ...(layers !== layerRecord ? { layers } : {}) };
};

/**
 * A read-only store whose every scene is `base`'s with `overrides` merged over it (`applyOverrides`). Writes to it are
 * dropped, so a host shows it in a read-only view; the stored drawing never changes.
 */
export const createOverrideStore = (base: SceneStore, overrides: Atom.Atom<SceneOverrides>): SceneStore => {
  const scenes = Atom.keepAlive(
    Atom.writable(
      (get): SceneMap => {
        const stored = get(base.scenes);
        const values = get(overrides);
        return Object.fromEntries(Object.entries(stored).map(([id, scene]) => [id, applyOverrides(scene, values[id])]));
      },
      (_ctx, _value: SceneMap) => {},
    ),
  );
  const derived = new Map<SceneId, Atom.Atom<Scene | undefined>>();
  return {
    scenes,
    ...(base.styles ? { styles: base.styles } : {}),
    scene: (id) => {
      let atom = derived.get(id);
      if (!atom) {
        atom = Atom.keepAlive(
          Atom.make((get) => {
            const scene = get(base.scene(id));
            return scene && applyOverrides(scene, get(overrides)[id]);
          }),
        );
        derived.set(id, atom);
      }
      return atom;
    },
  };
};
