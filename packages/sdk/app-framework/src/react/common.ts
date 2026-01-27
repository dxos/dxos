//
// Copyright 2025 DXOS.org
//

import { type Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext } from 'react';

import type { OperationInvoker } from '@dxos/operation';

import * as Common from '../common';

import { useAtomCapability, useCapability } from './useCapabilities';

export const useOperationInvoker = (): Common.Capability.OperationInvoker =>
  useCapability(Common.Capability.OperationInvoker);

export const useAppGraph = (): Common.Capability.AppGraph => useCapability(Common.Capability.AppGraph);

export const useLayout = (): Common.Capability.Layout => useAtomCapability(Common.Capability.Layout);

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
