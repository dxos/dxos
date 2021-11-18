//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ClientContext } from './context';

/**
 * Hook returning config object used to initialize the DXOS client instance.
 * To be used with `ClientProvider` or `ClientInitializer` component wrapper.
 */
export const useConfig = () => {
  const { config } = useContext(ClientContext) ?? raise(new Error('ClientProvider no set.'));
  return config;
};
