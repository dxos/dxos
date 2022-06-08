//
// Copyright 2020 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import type { AccountClient, RegistryClient } from '@dxos/registry-client';

export type RegistryContext = {
  registry: RegistryClient
  // TODO(wittjosiah): Should this go here? Should it be required?
  accounts?: AccountClient
}

export const RegistryContext = createContext<RegistryContext | undefined>(undefined);

/**
 * Requires `RegistryProvider` component wrapper.
 */
export const useRegistry = (): RegistryClient => {
  const context = useContext(RegistryContext) ??
    raise(new Error('`useRegistry` hook is called outside of RegistryContext.'));

  return context.registry;
};

/**
 * Returns the AccountClient for interacting with DXNS developer accounts.
 *
 * Requires `RegistryProvider` component wrapper.
 */
export const useAccountClient = (): AccountClient | undefined => {
  const context = useContext(RegistryContext) ??
    raise(new Error('`useAccountClient` hook is called outside of RegistryContext.'));

  return context.accounts;
};
