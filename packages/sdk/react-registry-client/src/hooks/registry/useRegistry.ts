//
// Copyright 2020 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import type { IRegistryClient } from '@dxos/registry-client';

type ContextValue = {
  registry: IRegistryClient
}

export const RegistryContext = createContext<ContextValue | undefined>(undefined);

/**
 * Requires `RegistryProvider` component wrapper.
 */
export const useRegistry = (): IRegistryClient => {
  const context = useContext(RegistryContext) ??
    raise(new Error('`useRegistry` hook is called outside of RegistryContext.'));

  return context.registry;
};
