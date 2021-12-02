//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ClientContext } from './context';

/**
 * Hook returning config object used to initialize the DXOS client instance.
 * Requires ClientConext to be set via ClientProvider.
 */
export const useConfig = () => {
  const { config } = useContext(ClientContext) ?? raise(new Error('ClientContext no set.'));
  return config;
};
