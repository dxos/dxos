//
// Copyright 2026 DXOS.org
//

//
// Scene store seam: scenes by id behind atoms, so a view subscribes to exactly the scene it shows and
// an ECHO-backed store (phase 3) can replace the in-memory one without touching the surface.
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type Scene, type SceneId } from './types.ts';

export type SceneMap = Readonly<Record<SceneId, Scene>>;

export type SceneStore = {
  /** Every scene, keyed by id. Written through the registry. */
  readonly scenes: Atom.Writable<SceneMap>;
  /** Derived atom for one scene; stable per id so subscriptions do not churn. */
  scene: (id: SceneId) => Atom.Atom<Scene | undefined>;
};

export const createMemoryStore = (initial: readonly Scene[] = []): SceneStore => {
  const scenes = Atom.keepAlive(Atom.make<SceneMap>(Object.fromEntries(initial.map((scene) => [scene.id, scene]))));
  const derived = new Map<SceneId, Atom.Atom<Scene | undefined>>();
  return {
    scenes,
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
