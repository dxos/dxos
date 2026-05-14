//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
import { type Actor, Person } from '@dxos/types';

// TODO(burdon): Factor out lazy update pattern.
export const useActorContact = (db?: Database.Database, actor?: Actor.Actor): URI.URI | undefined => {
  // Don't bother querying the space if there is already a reference to the contact.
  const isLinked = !!actor?.contact;
  const contacts = useQuery(isLinked ? undefined : db, Filter.type(Person.Person));
  const existingContact = useMemo(
    () => contacts.find((contact) => contact.emails?.find((email) => email.value === actor?.email)),
    [contacts, actor?.email],
  );

  return useMemo(
    () => (actor?.contact ? actor.contact.dxn : existingContact ? Obj.getEchoId(existingContact) : undefined),
    [actor?.contact, existingContact],
  );
};
