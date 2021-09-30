//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/util';

import { RegistryContext } from './context';

/**
 * Low-level hook returning instance of DXNS registry.
 * To be used with `RegistryProvider` or `RegistryInitializer` component wrapper.
 */
export const useRegistry = () => {
  const context = useContext(RegistryContext) ?? raise(new Error('`useRegistry` hook is called outside of RegistryContext. Wrap the component with `RegistryProvider` or `RegistryInitializer`'));
  return context.registry;
};
