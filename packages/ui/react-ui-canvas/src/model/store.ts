//
// Copyright 2026 DXOS.org
//

//
// Scene store seam: scenes by id behind atoms, so a view subscribes to exactly the scene it shows and
// an ECHO-backed store (phase 3) can replace the in-memory one without touching the surface.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type Scene, type SceneId, type StyleMap } from './types.ts';

export type SceneMap = Readonly<Record<SceneId, Scene>>;

export type SceneStore = {
  /** Every scene, keyed by id. Written through the registry. */
  readonly scenes: Atom.Writable<SceneMap>;
  /** Derived atom for one scene; stable per id so subscriptions do not churn. */
  scene: (id: SceneId) => Atom.Atom<Scene | undefined>;
  /** The drawing's style classes; a store without them offers none. */
  readonly styles?: Atom.Writable<StyleMap>;
};

/** A store held in memory, which always keeps style classes. */
export type MemorySceneStore = SceneStore & { readonly styles: Atom.Writable<StyleMap> };

export const createMemoryStore = (initial: readonly Scene[] = [], initialStyles: StyleMap = {}): MemorySceneStore => {
  const styles = Atom.keepAlive(Atom.make<StyleMap>(initialStyles));
  const scenes = Atom.keepAlive(Atom.make<SceneMap>(Object.fromEntries(initial.map((scene) => [scene.id, scene]))));
  const derived = new Map<SceneId, Atom.Atom<Scene | undefined>>();
  return {
    scenes,
    styles,
    scene: (id) => {
      let atom = derived.get(id);
      if (!atom) {
        atom = Atom.keepAlive(Atom.make((get) => get(scenes)[id]));
        derived.set(id, atom);
      }
      return atom;
    },
  };
};

/** Replace one scene in the store (a no-op when the updater returns the same object). */
export const updateScene = (
  registry: Registry.AtomRegistry,
  store: SceneStore,
  id: SceneId,
  update: (scene: Scene) => Scene,
): void => {
  const scenes = registry.get(store.scenes);
  const current = scenes[id];
  if (!current) {
    return;
  }
  const next = update(current);
  if (next !== current) {
    registry.set(store.scenes, { ...scenes, [id]: next });
  }
};

export const putScene = (registry: Registry.AtomRegistry, store: SceneStore, scene: Scene): void => {
  registry.set(store.scenes, { ...registry.get(store.scenes), [scene.id]: scene });
};

/** No classes: what a store without `styles` reads as. */
export const NO_STYLES: Atom.Atom<StyleMap> = Atom.keepAlive(Atom.make<StyleMap>({}));
