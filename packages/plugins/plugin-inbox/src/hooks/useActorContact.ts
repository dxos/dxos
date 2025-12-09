//
// Copyright 2025 DXOS.org
//

import { type Signal, useComputed, useSignal } from '@preact/signals-react';
import { useEffect } from 'react';

import { type DXN, type Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { type Actor, Person } from '@dxos/types';

// TODO(burdon): Factor out lazy update pattern.
export const useActorContact = (db?: Database.Database, actor?: Actor.Actor): Signal<DXN | undefined> => {
  // Don't bother querying the space if there is already a reference to the contact.
  const isLinked = !!actor?.contact;
  const contacts = useQuery(isLinked ? undefined : db, Filter.type(Person.Person));
  const existingContact = useSignal<Person.Person | undefined>(undefined);
  useEffect(() => {
    existingContact.value = contacts.find((contact) => contact.emails?.find((email) => email.value === actor?.email));
  }, [contacts, actor?.email, existingContact]);

  return useComputed(() =>
    actor?.contact ? actor.contact.dxn : existingContact.value ? Obj.getDXN(existingContact.value) : undefined,
  );
};
