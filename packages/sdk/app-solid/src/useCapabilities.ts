//
// Copyright 2025 DXOS.org
//

import { type Accessor } from 'solid-js';

import { type InterfaceDef } from '@dxos/app-framework';
import { useAtomValue } from '@dxos/effect-atom-solid';
import { invariant } from '@dxos/invariant';

import { usePluginManager } from './usePluginManager';

/**
 * Hook to request capabilities from the plugin context.
 * @returns An array of capabilities.
 */
export const useCapabilities = <T>(interfaceDef: InterfaceDef<T>): Accessor<T[]> => {
  const manager = usePluginManager();
  return useAtomValue(manager.context.capabilities(interfaceDef));
};

/**
 * Hook to request a capability from the plugin context.
 * @returns The capability.
 * @throws If no capability is found.
 */
export const useCapability = <T>(interfaceDef: InterfaceDef<T>): Accessor<T> => {
  const capabilities = useCapabilities(interfaceDef);
  return () => {
    const caps = capabilities();
    invariant(caps.length > 0, `No capability found for ${interfaceDef.identifier}`);
    return caps[0];
  };
};
