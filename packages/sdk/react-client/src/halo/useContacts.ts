//
// Copyright 2020 DXOS.org
//

import type { Contact } from '@dxos/client/halo';
import { useMulticastObservable } from '@dxos/react-async';

import { useClient } from '../client';

/**
 * Returns all known Contacts across all Spaces.
 * Contacts are known members of a common Space.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useContacts = (): Contact[] => {
  const client = useClient();
  return useMulticastObservable(client.halo.contacts);
};
