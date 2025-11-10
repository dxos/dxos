//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';

import { invariant } from '@dxos/invariant';

import { type InterfaceDef } from '../core';

import { usePluginManager } from './PluginManagerProvider';

/**
 * Hook to request capabilities from the plugin context.
 * @returns An array of capabilities.
 */
export const useCapabilities = <T>(interfaceDef: InterfaceDef<T>) => {
  const manager = usePluginManager();
  return useAtomValue(manager.context.capabilities(interfaceDef));
};

/**
 * Hook to request a capability from the plugin context.
 * @returns The capability.
 * @throws If no capability is found.
 */
export const useCapability = <T>(interfaceDef: InterfaceDef<T>) => {
  const capabilities = useCapabilities(interfaceDef);
  invariant(capabilities.length > 0, `No capability found for ${interfaceDef.identifier}`);
  return capabilities[0];
};
