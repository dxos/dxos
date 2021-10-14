//
// Copyright 2020 DXOS.org
//

import { createContext, useContext } from 'react';

import type { IRegistryClient } from '@dxos/registry-client';
import { raise } from '@dxos/util';

type ContextValue = {
  registry: IRegistryClient
}

export const RegistryContext = createContext<ContextValue | undefined>(undefined);

/**
 * Low-level hook returning instance of DXNS registry.
 * To be used with `RegistryProvider` or `RegistryInitializer` component wrapper.
 */
export const useRegistry = (): IRegistryClient => {
  const context = useContext(RegistryContext) ??
    raise(new Error('`useRegistry` hook is called outside of RegistryContext.'));

  return context.registry;
};
