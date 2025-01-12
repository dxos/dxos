//
// Copyright 2025 DXOS.org
//

import { usePluginManager } from './PluginManagerProvider';
import { type InterfaceDef } from '../core';

/**
 *
 */
export const useCapabilities = <T, U extends T = T>(
  interfaceDef: InterfaceDef<T>,
  filter?: (capability: T) => capability is U,
) => {
  const manager = usePluginManager();
  return manager.context.requestCapabilities(interfaceDef, filter);
};

/**
 *
 */
export const useCapability = <T, U extends T = T>(
  interfaceDef: InterfaceDef<T>,
  filter?: (capability: T) => capability is U,
) => {
  const manager = usePluginManager();
  return manager.context.requestCapability(interfaceDef, filter);
};
