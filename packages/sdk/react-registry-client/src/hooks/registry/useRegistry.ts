//
// Copyright 2020 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/util';

import type { IRegistryClient } from '@dxos/registry-client';

type ContextValue = {
  registry?: IRegistryClient | undefined,
}

export const RegistryContext = createContext<ContextValue | undefined>(undefined);

/**
 * Low-level hook returning instance of DXNS registry.
 * To be used with `RegistryProvider` or `RegistryInitializer` component wrapper.
 */
export const useRegistry = () => {
  const context = useContext(RegistryContext) ?? raise(new Error('`useRegistry` hook is called outside of RegistryContext. Wrap the component with `RegistryProvider` or `RegistryInitializer`'));
  return context.registry;
};
