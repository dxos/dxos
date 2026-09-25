//
// Copyright 2024 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ClientContext } from '../client/context.ts';

/**
 * Hook returning instance of DXOS client.
 * Requires ClientContext to be set via ClientProvider.
 *
 * Under a `suspend` ClientProvider the context is available before `client.initialize()`
 * completes; this hook then suspends (throws the initialization promise) so any component
 * depending on the client parks at its nearest Suspense boundary instead of reading an
 * uninitialized client.
 *
 * Deliberately no timeout here: React retries a rejected thrown promise and the retry suspends
 * again, so a rejection loops rather than reaching an error boundary (measured: ~90 renders in
 * 500ms). A stalled initialization is bounded once, at the app entry point, which raises it as a
 * fatal error instead.
 */
export const useClient = () => {
  const { client } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  if (!client.initialized) {
    throw client.waitUntilInitialized();
  }
  return client;
};
