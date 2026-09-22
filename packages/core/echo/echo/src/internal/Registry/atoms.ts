//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import type * as Registry from '../../Registry.ts';
import * as Type from '../../Type.ts';

/**
 * Atom family for the type entity registered under a typename.
 * Keyed by a structurally-equal tuple key `[registry, typename]` so nested families are avoided.
 */
const typeEntityFamily = Atom.family(
  ([registry, typename]: readonly [Registry.Registry, string]): Atom.Atom<Type.AnyEntity | undefined> => {
    const read = (): Type.AnyEntity | undefined =>
      registry
        .list()
        .filter(Type.isType)
        .find((type) => Type.getTypename(type) === typename);

    return Atom.make<Type.AnyEntity | undefined>((get) => {
      let previous = read();

      const unsubscribe = registry.changed.on(() => {
        const next = read();
        // The registry also holds operations, skills, and routines, whose churn must not re-run
        // consumers keyed to an unrelated typename.
        if (next !== previous) {
          previous = next;
          get.setSelf(next);
        }
      });
      get.addFinalizer(() => unsubscribe());

      return previous;
    });
  },
);

/**
 * Reactive atom for the type entity registered under `typename`, or `undefined` while unregistered.
 */
export const makeTypeAtom = (registry: Registry.Registry, typename: string): Atom.Atom<Type.AnyEntity | undefined> =>
  typeEntityFamily([registry, typename]);
