//
// Copyright 2023 DXOS.org
//

import { Contact as ContactType, Message as MessageType } from '@braneframe/types';
import { hasType } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

export const handler = subscriptionHandler(async ({ event: { space, objects } }) => {
  invariant(space);
  const { objects: contacts } = space.db.query(ContactType.filter());
  const getOrCreateContact = (recipient: MessageType.Recipient): ContactType | undefined => {
    let contact = contacts.find((contact) =>
      contact.identifiers.find((identifier) => identifier.value === recipient.email),
    );
    if (!contact) {
      contact = new ContactType({ name: recipient.name, identifiers: [{ type: 'email', value: recipient.email }] });
      space.db.add(contact);
    }

    return contact;
  };

  let messages: MessageType[];
  if (objects) {
    messages = objects.filter(hasType<MessageType>(MessageType.schema));
  } else {
    messages = space.db.query(MessageType.filter({ type: 'email' })).objects;
  }

  // Lookup contacts.
  for (const message of messages ?? []) {
    message.from.contact = getOrCreateContact(message.from);
    message.to.forEach((to) => {
      to.contact = getOrCreateContact(to);
    });
    message.cc?.forEach((cc) => {
      cc.contact = getOrCreateContact(cc);
    });
  }
});
