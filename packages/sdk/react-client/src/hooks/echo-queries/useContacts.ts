//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { PartyMember } from '@dxos/client';

import { useClient } from '../client';

/**
 * Returns all known Contacts across all Parties.
 * Contacts are known members of a common Party.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useContacts = () => {
  const client = useClient();
  const [contacts, setContacts] = useState<PartyMember[]>([]);

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
