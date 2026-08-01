//
// Copyright 2024 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ClientContext } from '../client/context';

/**
 * Hook returning instance of DXOS client.
 * Requires ClientContext to be set via ClientProvider.
 *
 * Under a `suspend` ClientProvider the context is available before `client.initialize()`
 * completes; this hook then suspends (throws the initialization promise) so any component
 * depending on the client parks at its nearest Suspense boundary instead of reading an
 * uninitialized client.
 */
export const useClient = () => {
  const { client } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  if (!client.initialized) {
    throw client.waitUntilInitialized();
  }
  return client;
};
