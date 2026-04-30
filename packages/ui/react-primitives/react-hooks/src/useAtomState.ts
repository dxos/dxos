//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import { useMemo, useState } from 'react';

export type AtomState<T> = {
  atom: Atom.Writable<T>;
  value: T;
  set: (value: T | ((value: T) => T)) => void;
};

/**
 * Wraps a writable atom together with its current value and setter.
 * The atom is created once on first render; `initialValue` is only used to seed it.
 */
export const useAtomState = <T>(initialValue: T): AtomState<T> => {
  const [atom] = useState(() => Atom.make(initialValue));
  const value = useAtomValue(atom);
  const set = useAtomSet(atom);
  return useMemo(() => ({ atom, value, set }), [atom, value, set]);
};
