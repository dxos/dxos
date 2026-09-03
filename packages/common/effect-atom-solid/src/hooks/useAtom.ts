//
// Copyright 2025 DXOS.org
//

import type * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import { type Accessor, createSignal, onCleanup } from 'solid-js';

import { useRegistry } from '../registry.ts';
import { type SetAtomFn, createSetAtom } from './useAtomSet.ts';

/**
 * Hook to both read and write an atom
 * Returns a tuple of [value accessor, setter function]
 */
export function useAtom<R, W, Mode extends 'value' | 'promise' | 'promiseExit' = never>(
  atom: Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : 'value') | undefined;
  },
): readonly [Accessor<R>, SetAtomFn<R, W, Mode>] {
  const registry = useRegistry();

  const [value, setValue] = createSignal<R>(registry.get(atom));

  // Subscribe to atom changes
  const unsubscribe = registry.subscribe(
    atom,
    (nextValue) => {
      setValue(() => nextValue);
    },
    { immediate: true },
  );

  onCleanup(unsubscribe);

  return [value, createSetAtom(registry, atom, options)] as const;
}
