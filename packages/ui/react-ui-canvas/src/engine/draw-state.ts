//
// Copyright 2026 DXOS.org
//

//
// The engine's draw state (COMMON-CORE C.2): the document's render lists by id behind atoms, read from the document
// before paint and edited in memory by gestures, so a viewport subscribes to exactly the list it shows. Private to the
// engine: hosts hand it a document, never a store.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type StyleMap, type ViewId } from '@dxos/scene';

import {
  type DrawnLists,
  type RenderList2D,
  type RenderLists2D,
  type VersionedSource,
  atomSource,
  withoutOrphans,
} from '../model/index.ts';

export type DrawState = DrawnLists & {
  /** Every list, keyed by id. Written through the registry. */
  readonly views: Atom.Writable<RenderLists2D>;
  readonly styles: Atom.Writable<StyleMap>;
};

export type DrawStateOptions = {
  /** The drawing's root: given, the lists and anonymous Objects nothing reaches from it are dropped on load. */
  root?: ViewId;
};

export const createDrawState = (
  initial: readonly RenderList2D[] = [],
  initialStyles: StyleMap = {},
  { root }: DrawStateOptions = {},
): DrawState => {
  const styles = Atom.keepAlive(Atom.make<StyleMap>(initialStyles));
  const loaded: RenderLists2D = Object.fromEntries(initial.map((view) => [view.id, view]));
  const views = Atom.keepAlive(Atom.make<RenderLists2D>(root === undefined ? loaded : withoutOrphans(loaded, [root])));
  const derived = new Map<ViewId, Atom.Atom<RenderList2D | undefined>>();
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

/** Replace one list in the draw state (a no-op when the updater returns the same object). */
export const updateView = (
  registry: Registry.AtomRegistry,
  state: DrawState,
  id: ViewId,
  update: (scene: RenderList2D) => RenderList2D,
): void => {
  const scenes = registry.get(state.views);
  const current = scenes[id];
  if (!current) {
    return;
  }
  const next = update(current);
  if (next !== current) {
    registry.set(state.views, { ...scenes, [id]: next });
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether `value` is a map of lists, as a patch must leave the draw state. */
export const isViewMap = (value: unknown): value is RenderLists2D =>
  isRecord(value) &&
  Object.values(value).every(
    (list) => isRecord(list) && typeof list.id === 'string' && isRecord(list.nodes) && isRecord(list.links),
  );

/** The draw state as a versioned source: its atom, whose snapshots are its heads. */
export const drawStateVersions = (registry: Registry.AtomRegistry, state: DrawState): VersionedSource =>
  atomSource(registry, state.views, isViewMap);
