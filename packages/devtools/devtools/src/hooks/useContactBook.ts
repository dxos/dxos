//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Contact } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';

export const useContactBook = () => {
  const client = useClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  useEffect(() => {
    const subscription = client.halo.contacts.subscribe((contacts: Contact[]) => {
      setContacts(contacts);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [client]);
  return contacts;
};
