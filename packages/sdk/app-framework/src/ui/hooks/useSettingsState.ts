//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import { useCallback, useContext } from 'react';

/**
 * Hook to read and update a settings atom.
 * Returns the current value and an update function.
 */
export const useSettingsState = <T>(
  atom: Atom.Writable<T>,
): { settings: T; updateSettings: (fn: (current: T) => T) => void } => {
  const registry = useContext(RegistryContext);
  const settings = useAtomValue(atom);

  const updateSettings = useCallback(
    (fn: (current: T) => T) => {
      registry.set(atom, fn(registry.get(atom)));
    },
    [registry, atom],
  );

  return { settings, updateSettings };
};
