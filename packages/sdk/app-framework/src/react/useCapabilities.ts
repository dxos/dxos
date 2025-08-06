//
// Copyright 2025 DXOS.org
//

import { useRxValue } from '@effect-rx/rx-react';
import { Layer } from 'effect';

import { invariant } from '@dxos/invariant';

import { type InterfaceDef } from '../core';

import { usePluginManager } from './PluginManagerProvider';

/**
 * Hook to request capabilities from the plugin context.
 * @returns An array of capabilities.
 */
export const useCapabilities = <T>(interfaceDef: InterfaceDef<T>): T[] => {
  const manager = usePluginManager();
  return useRxValue(manager.context.capabilities(interfaceDef));
};

/**
 * Hook to request a capability from the plugin context.
 * @returns The capability.
 * @throws If no capability is found.
 */
export const useCapability = <T>(interfaceDef: InterfaceDef<T>): T => {
  const capabilities = useCapabilities(interfaceDef);
  invariant(capabilities.length > 0, `No capability found for ${interfaceDef.identifier}`);
  return capabilities[0];
};

/**
 * Hook to request a capability layer from the plugin context.
 * If capability is not found, instead of throwing immediately it constructs a layer that dies.
 */
export const useCapabilityLayer = <T extends Layer.Layer<any>>(interfaceDef: InterfaceDef<T>): T => {
  const capabilities = useCapabilities(interfaceDef);
  const layer = capabilities.at(0) ?? Layer.die(`Layer not found: ${interfaceDef.identifier}`);
  return layer as T;
};
