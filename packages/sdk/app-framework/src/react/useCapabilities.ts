//
// Copyright 2025 DXOS.org
//

import { computed } from '@preact/signals-core';
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
  const signal = useMemo(
    () => computed(() => manager.context.requestCapabilities(interfaceDef, filter)),
    [interfaceDef, filter],
  );
  return signal.value;
};

/**
 *
 */
export const useCapability = <T, U extends T = T>(
  interfaceDef: InterfaceDef<T>,
  filter?: (capability: T) => capability is U,
) => {
  const manager = usePluginManager();
  const signal = useMemo(
    () => computed(() => manager.context.requestCapability(interfaceDef, filter)),
    [interfaceDef, filter],
  );
  return signal.value;
};
