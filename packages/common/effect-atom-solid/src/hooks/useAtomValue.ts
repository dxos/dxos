//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import * as AtomModule from '@effect-atom/atom/Atom';
import { type Accessor, createMemo, createSignal, onCleanup } from 'solid-js';

import { useRegistry } from '../registry';

/**
 * Hook to read the value of an atom
 * The returned accessor will update whenever the atom's value changes
 */
export function useAtomValue<A>(atom: Atom.Atom<A>): Accessor<A>;
export function useAtomValue<A, B>(atom: Atom.Atom<A>, f: (a: A) => B): Accessor<B>;
export function useAtomValue<A>(atom: Atom.Atom<A>, f?: (a: A) => A): Accessor<A> {
  const registry = useRegistry();

  // Use a mapped atom if a function is provided
  const actualAtom = f ? createMemo(() => AtomModule.map(atom, f)) : () => atom;

  const [value, setValue] = createSignal<A>(registry.get(actualAtom()));

  // Subscribe to atom changes
  const unsubscribe = registry.subscribe(
    actualAtom(),
    (nextValue) => {
      setValue(() => nextValue);
    },
    { immediate: true },
  );

  onCleanup(unsubscribe);

  return value;
}
