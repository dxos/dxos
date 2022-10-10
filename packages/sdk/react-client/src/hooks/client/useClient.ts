//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ClientContext } from './context.js';

/**
 * Hook returning instance of DXOS client.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useClient = () => {
  const { client } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return client;
};
