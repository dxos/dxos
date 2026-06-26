//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback } from 'react';

import { invariant } from '@dxos/invariant';

import { Capabilities } from '../../common';
import { type Capability } from '../../core';
import { useOptionalPluginManager, usePluginManager } from '../components';

/** Stable empty result for capability lookups made outside a plugin manager. */
const emptyCapabilities = Atom.make(() => [] as const);

/**
 * Hook to request capabilities from the plugin context.
 * @returns An array of capabilities.
 */
export const useCapabilities = <T>(interfaceDef: Capability.InterfaceDef<T>) => {
  const manager = usePluginManager();
  return useAtomValue(manager.capabilities.atom(interfaceDef));
};

/**
 * Hook to request a capability from the plugin context.
 * @returns The capability.
 * @throws If no capability is found.
 */
// TODO(burdon): Option not to throw?
export const useCapability = <T>(interfaceDef: Capability.InterfaceDef<T>) => {
  const capabilities = useCapabilities(interfaceDef);
  invariant(capabilities.length > 0, `No capability found for ${interfaceDef.identifier}`);
  return capabilities[0];
};

/**
 * Hook to request capabilities without requiring a plugin manager.
 * @returns An array of capabilities, or an empty array when rendered outside a {@link PluginManagerProvider}.
 */
export const useOptionalCapabilities = <T>(interfaceDef: Capability.InterfaceDef<T>): readonly T[] => {
  const manager = useOptionalPluginManager();
  return useAtomValue(
    manager ? manager.capabilities.atom(interfaceDef) : (emptyCapabilities as Atom.Atom<readonly T[]>),
  );
};

/**
 * Hook to request a single capability without requiring a plugin manager.
 * @returns The first matching capability, or `undefined` when none is registered (or there is no plugin manager).
 */
export const useOptionalCapability = <T>(interfaceDef: Capability.InterfaceDef<T>): T | undefined =>
  useOptionalCapabilities(interfaceDef)[0];

/**
 * Hook to get the current value of an atom capability.
 * Automatically subscribes to changes.
 * @example const settings = useAtomCapability(CommentCapabilities.Settings);
 */
export const useAtomCapability = <T>(atomCapability: Capability.InterfaceDef<Atom.Atom<T>>): T => {
  const atom = useCapability(atomCapability);
  return useAtomValue(atom);
};

/**
 * Hook to get value and updater for an atom capability.
 * Returns [currentValue, updateFn] similar to useState.
 * @example const [settings, updateSettings] = useAtomCapabilityState(CommentCapabilities.Settings);
 */
export const useAtomCapabilityState = <T>(
  atomCapability: Capability.InterfaceDef<Atom.Writable<T>>,
): [T, (fn: (current: T) => T) => void] => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const atom = useCapability(atomCapability);
  const value = useAtomValue(atom);
  const update = useCallback(
    (fn: (current: T) => T) => {
      registry.set(atom, fn(registry.get(atom)));
    },
    [registry, atom],
  );
  return [value, update];
};

/**
 * Hook to get the operation invoker capability.
 */
export const useOperationInvoker = (): Capabilities.OperationInvoker => useCapability(Capabilities.OperationInvoker);
