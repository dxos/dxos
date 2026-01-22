//
// Copyright 2025 DXOS.org
//

import { type Atom, useAtomValue } from '@effect-atom/atom-react';
import { useCallback } from 'react';

import { invariant } from '@dxos/invariant';

import * as Common from '../common';
import { type Capability } from '../core';

import { usePluginManager } from './PluginManagerProvider';

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
export const useCapability = <T>(interfaceDef: Capability.InterfaceDef<T>) => {
  const capabilities = useCapabilities(interfaceDef);
  invariant(capabilities.length > 0, `No capability found for ${interfaceDef.identifier}`);
  return capabilities[0];
};

/**
 * Hook to get the current value of an atom capability.
 * Automatically subscribes to changes.
 * @example const settings = useAtomCapability(ThreadCapabilities.Settings);
 */
export const useAtomCapability = <T>(atomCapability: Capability.InterfaceDef<Atom.Writable<T>>): T => {
  const atom = useCapability(atomCapability);
  return useAtomValue(atom);
};

/**
 * Hook to get value and updater for an atom capability.
 * Returns [currentValue, updateFn] similar to useState.
 * @example const [settings, updateSettings] = useAtomCapabilityState(ThreadCapabilities.Settings);
 */
export const useAtomCapabilityState = <T>(
  atomCapability: Capability.InterfaceDef<Atom.Writable<T>>,
): [T, (fn: (current: T) => T) => void] => {
  const registry = useCapability(Common.Capability.AtomRegistry);
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
