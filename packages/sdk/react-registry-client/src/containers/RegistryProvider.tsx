//
// Copyright 2020 DXOS.org
//

import React, { ReactNode } from 'react';

import { RegistryApi } from '@dxos/registry-api';

import { RegistryContext } from '../hooks';

export interface RegistryProviderProps {
  registry?: RegistryApi
  children?: ReactNode
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
