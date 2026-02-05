//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import * as AtomModule from '@effect-atom/atom/Atom';
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { useRegistry } from '../registry';

/**
 * A value that may be a static value or a reactive accessor.
 */
type MaybeAccessor<T> = T | Accessor<T>;

/**
 * Resolves a MaybeAccessor to its value.
 */
const access = <T>(value: MaybeAccessor<T>): T => (typeof value === 'function' ? (value as Accessor<T>)() : value);

/**
 * Hook to read the value of an atom.
 * The returned accessor will update whenever the atom's value changes.
 * The atom parameter can be reactive (MaybeAccessor) - if the atom changes,
 * the hook will automatically unsubscribe from the old atom and subscribe to the new one.
 */
export function useAtomValue<A>(atom: MaybeAccessor<Atom.Atom<A>>): Accessor<A>;
export function useAtomValue<A, B>(atom: MaybeAccessor<Atom.Atom<A>>, f: (a: A) => B): Accessor<B>;
export function useAtomValue<A>(atom: MaybeAccessor<Atom.Atom<A>>, f?: (a: A) => A): Accessor<A> {
  const registry = useRegistry();

  // Resolve the atom reactively and apply mapping if provided.
  const resolvedAtom = createMemo(() => {
    const a = access(atom);
    return f ? AtomModule.map(a, f) : a;
  });

  const [value, setValue] = createSignal<A>(registry.get(resolvedAtom()));

  // Subscribe to atom changes reactively - re-subscribes when atom changes.
  createEffect(() => {
    const currentAtom = resolvedAtom();
    setValue(() => registry.get(currentAtom));

    const unsubscribe = registry.subscribe(
      currentAtom,
      (nextValue) => {
        setValue(() => nextValue);
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  return value;
}
