//
// Copyright 2025 DXOS.org
//

import type * as AtomRef from '@effect-atom/atom/AtomRef';
import { type Accessor, createMemo, createSignal, onCleanup } from 'solid-js';

/**
 * Hook to read an AtomRef value
 */
export function useAtomRef<A>(ref: AtomRef.ReadonlyRef<A>): Accessor<A> {
  const [value, setValue] = createSignal<A>(ref.value);

  const unsubscribe = ref.subscribe((next) => {
    setValue(() => next);
  });

  onCleanup(unsubscribe);

  return value;
}

/**
 * Hook to get a prop accessor from an AtomRef
 */
export function useAtomRefProp<A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K): AtomRef.AtomRef<A[K]> {
  return createMemo(() => ref.prop(prop))();
}

/**
 * Hook to read a prop value from an AtomRef
 */
export function useAtomRefPropValue<A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K): Accessor<A[K]> {
  return useAtomRef(useAtomRefProp(ref, prop));
}
