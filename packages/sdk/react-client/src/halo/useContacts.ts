//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { useClient } from '../client';

/**
 * Returns all known Contacts across all Spaces.
 * Contacts are known members of a common Space.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useContacts = () => {
  const client = useClient();
  const contacts = useSyncExternalStore(
    (listener) => client.halo.subscribeContacts(listener),
    () => client.halo.getContacts
  );

  return contacts;
};
