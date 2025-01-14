//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

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
  return useMemo(() => manager.context.requestCapabilities(interfaceDef, filter), [interfaceDef, filter]);
};

/**
 *
 */
export const useCapability = <T, U extends T = T>(
  interfaceDef: InterfaceDef<T>,
  filter?: (capability: T) => capability is U,
) => {
  const manager = usePluginManager();
  return useMemo(() => manager.context.requestCapability(interfaceDef, filter), [interfaceDef, filter]);
};
