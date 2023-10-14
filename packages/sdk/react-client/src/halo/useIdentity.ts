//
// Copyright 2020 DXOS.org
//

import { type Identity } from '@dxos/client/halo';
import { useMulticastObservable } from '@dxos/react-async';

import { useClient } from '../client';

/**
 * Hook returning DXOS identity object.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useIdentity = (): Identity | null => {
  const client = useClient();
  return useMulticastObservable(client.halo.identity);
};
