//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { PartyMember } from '@dxos/echo-db';

import { useClient } from '../client';

/**
 * Returns an Array of all known Contacts across all Parties.
 * @returns [Array<Contacts>]
 */
export function useContacts () {
  const client = useClient();
  const [contacts, setContacts] = useState<PartyMember[]>([]);

  useEffect(() => {
    const result = client.echo.halo.queryContacts();
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

  return [contacts];
}
