//
// Copyright 2020 DXOS.org
//

import React, { ReactNode } from 'react';

import type { IRegistryClient } from '@dxos/registry-client';

import { RegistryContext } from '../hooks';

export interface RegistryProviderProps {
  registry: IRegistryClient
  children: ReactNode
}

/**
 * Root component that provides the DXNS registry instance to child components.
 * To be used with `useRegistry` hook.
 */
const RegistryProvider = ({ registry, children }: RegistryProviderProps) => {
  return (
    <RegistryContext.Provider value={{ registry }}>
      {children}
    </RegistryContext.Provider>
  );
};

export default RegistryProvider;
