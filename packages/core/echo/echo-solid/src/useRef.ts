//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { type MaybeAccessor, access } from '@solid-primitives/utils';
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { type Entity, type Ref } from '@dxos/echo';
import { AtomRef } from '@dxos/echo-atom';
import { useRegistry } from '@dxos/effect-atom-solid';

/** Constant atom that always returns undefined (for when ref is undefined). */
const UNDEFINED_ATOM: Atom.Atom<undefined> = Atom.make(() => undefined);

/**
 * Subscribe to a reference target object.
 * Returns undefined if the reference is undefined or hasn't loaded yet.
 * Automatically updates when the target loads or changes.
 *
 * @param ref - The reference to subscribe to (can be reactive).
 * @returns An accessor that returns the current target object or undefined if not loaded.
 */
export function useRef<T extends Entity.Unknown>(ref: MaybeAccessor<Ref.Ref<T> | undefined>): Accessor<T | undefined> {
  const registry = useRegistry();

  // Memoize the ref to track changes.
  const memoizedRef = createMemo(() => access(ref));

  // Store the current target in a signal.
  const [target, setTarget] = createSignal<T | undefined>(undefined);

  // Subscribe to ref target changes.
  createEffect(() => {
    const currentRef = memoizedRef();

    const atom = currentRef ? AtomRef.make(currentRef) : UNDEFINED_ATOM;
    const currentValue = registry.get(atom);
    setTarget(() => currentValue as T | undefined);

    const unsubscribe = registry.subscribe(
      atom,
      () => {
        setTarget(() => registry.get(atom) as T | undefined);
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  return target;
}
