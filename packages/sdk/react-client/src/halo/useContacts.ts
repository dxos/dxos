//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Contact } from '@dxos/client';

import { useClient } from '../client';

/**
 * Returns all known Contacts across all Spaces.
 * Contacts are known members of a common Space.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useContacts = () => {
  const client = useClient();
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const result = client.halo.queryContacts();
    setContacts(result.value);

    const unsubscribe = result.subscribe(() => {
      setContacts(result.value);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return contacts;
};
