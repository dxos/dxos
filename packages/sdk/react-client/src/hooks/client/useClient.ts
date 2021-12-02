//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ClientContext } from './context';

/**
 * Hook returning instance of DXOS client.
 * Requires ClientConext to be set via ClientProvider.
 */
export const useClient = () => {
  return useContext(ClientContext) ?? raise(new Error('ClientContext no set.'));
};
