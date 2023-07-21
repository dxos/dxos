//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import type { Contact } from '@dxos/client/halo';

import { useClient } from '../client';

/**
 * Returns all known Contacts across all Spaces.
 * Contacts are known members of a common Space.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useContacts = (): Contact[] => {
  const client = useClient();
  const contacts = useSyncExternalStore(
    (listener) => {
      const subscription = client.halo.contacts.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => client.halo.contacts.get(),
  );

  return contacts;
};
