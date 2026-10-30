//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { type StyleMap, type ViewId } from '@dxos/scene';

import { type View } from './types.ts';

/**
 * The render lists a layer draws from: another list by id (a portal's scene, an instance's parts), and the drawing's
 * style classes. Read-only: a node view draws what the engine holds and never writes it.
 */
export type DrawnLists = {
  /** One list by id; stable per id, so a subscription does not churn. */
  view: (id: ViewId) => Atom.Atom<View | undefined>;
  /** The drawing's style classes; none when absent. */
  readonly styles?: Atom.Atom<StyleMap>;
};

/** No classes: what lists without `styles` read as. */
export const NO_STYLES: Atom.Atom<StyleMap> = Atom.keepAlive(Atom.make<StyleMap>({}));

/** Lists that never change, for a node view drawn outside an engine (a test, a thumbnail). */
export const staticLists = (lists: readonly View[]): DrawnLists => {
  const byId = new Map(lists.map((list) => [list.id, Atom.make<View | undefined>(list)]));
  const missing = Atom.make<View | undefined>(undefined);
  return { view: (id) => byId.get(id) ?? missing };
};
