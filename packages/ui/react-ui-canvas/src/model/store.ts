//
// Copyright 2026 DXOS.org
//

//
// View store seam: Views by id behind atoms, so a viewport subscribes to exactly the View it shows and
// an ECHO-backed store (phase 3) can replace the in-memory one without touching the surface.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import { type StyleMap, type ViewId } from '@dxos/scene';

import { withoutOrphans } from './orphans.ts';
import { OpenView, type View, withLegacyView } from './types.ts';
import { type VersionedSource, atomSource } from './versioned.ts';

export type ViewMap = Readonly<Record<ViewId, View>>;

export type ViewStore = {
  /** Every View, keyed by id. Written through the registry. */
  readonly views: Atom.Writable<ViewMap>;
  /** Derived atom for one View; stable per id so subscriptions do not churn. */
  view: (id: ViewId) => Atom.Atom<View | undefined>;
  /** The drawing's style classes; a store without them offers none. */
  readonly styles?: Atom.Writable<StyleMap>;
  /**
   * Whether a View is a root of its own (a linked drawing's), kept when no node opens it; the canvas's own root is
   * always kept, so a store without other roots leaves this out.
   */
  readonly isRoot?: (id: ViewId) => boolean;
  /**
   * How undo reads the store's past (VIEWS.md §8.4), as paths into `views`; absent, the atom's own values are the
   * heads, which is what an in-memory store has.
   */
  readonly versions?: VersionedSource;
};

/** A store held in memory, which always keeps style classes; Views saved under legacy node types read as current. */
export type MemoryViewStore = ViewStore & { readonly styles: Atom.Writable<StyleMap> };

export type MemoryStoreOptions = {
  /** The drawing's root: given, the Views and anonymous Objects nothing reaches from it are dropped on load. */
  root?: ViewId;
};

export const createMemoryStore = (
  initial: readonly View[] = [],
  initialStyles: StyleMap = {},
  { root }: MemoryStoreOptions = {},
): MemoryViewStore => {
  const styles = Atom.keepAlive(Atom.make<StyleMap>(initialStyles));
  const loaded: ViewMap = Object.fromEntries(initial.map((view) => [view.id, withLegacyView(view)]));
  const views = Atom.keepAlive(Atom.make<ViewMap>(root === undefined ? loaded : withoutOrphans(loaded, [root])));
  const derived = new Map<ViewId, Atom.Atom<View | undefined>>();
  return {
    views,
    styles,
    view: (id) => {
      let atom = derived.get(id);
      if (!atom) {
        atom = Atom.keepAlive(Atom.make((get) => get(views)[id]));
        derived.set(id, atom);
      }
      return atom;
    },
  };
};

/** Replace one View in the store (a no-op when the updater returns the same object). */
export const updateView = (
  registry: Registry.AtomRegistry,
  store: ViewStore,
  id: ViewId,
  update: (scene: View) => View,
): void => {
  const scenes = registry.get(store.views);
  const current = scenes[id];
  if (!current) {
    return;
  }
  const next = update(current);
  if (next !== current) {
    registry.set(store.views, { ...scenes, [id]: next });
  }
};

export const putView = (registry: Registry.AtomRegistry, store: ViewStore, scene: View): void => {
  registry.set(store.views, { ...registry.get(store.views), [scene.id]: scene });
};

const isView = Schema.is(OpenView);

/** Whether `value` is a map of Views, as a patch must leave the store. */
export const isViewMap = (value: unknown): value is ViewMap =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(isView);

/** The store as a versioned source: its own when it has one, else its atom, whose snapshots are its heads. */
export const storeVersions = (registry: Registry.AtomRegistry, store: ViewStore): VersionedSource =>
  store.versions ?? atomSource(registry, store.views, isViewMap);

/** No classes: what a store without `styles` reads as. */
export const NO_STYLES: Atom.Atom<StyleMap> = Atom.keepAlive(Atom.make<StyleMap>({}));
