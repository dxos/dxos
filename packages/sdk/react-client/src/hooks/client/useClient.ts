//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ClientContext } from './context';

/**
 * Hook returning instance of DXOS client.
 * To be used with `ClientProvider` or `ClientInitializer` component wrapper.
 */
export const useClient = () => {
  return useContext(ClientContext) ?? raise(new Error('ClientContext no set.'));
};
