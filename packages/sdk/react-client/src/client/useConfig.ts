//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ClientContext } from './context';

/**
 * Hook returning config object used to initialize the DXOS client instance.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useConfig = () => {
  const { client } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return client.config;
};
