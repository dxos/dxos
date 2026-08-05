//
// Copyright 2026 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

/**
 * Returns an atom that follows `source` but only updates after the source has stopped changing
 * for `delayMs`. Unlike deferral, this coalesces a burst of rapid updates into a single settled
 * value, so dependents (e.g. a paginated query's AST) change only when the user pauses typing.
 */
export const debounceAtom = <T>(source: Atom.Atom<T>, delayMs: number): Atom.Atom<T> =>
  Atom.make((get) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    get.subscribe(source, (value) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => get.setSelf(value), delayMs);
    });
    get.addFinalizer(() => clearTimeout(timeout));
    return get.once(source);
  });
