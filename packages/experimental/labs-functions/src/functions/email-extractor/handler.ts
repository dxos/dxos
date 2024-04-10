//
// Copyright 2023 DXOS.org
//

import { ContactType, MessageType, type RecipientType } from '@braneframe/types';
import { Filter, hasType } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { registerTypes } from '../../util';

export const handler = subscriptionHandler(async ({ event: { space, objects } }) => {
  let i = 0;
  invariant(space);
  const { objects: contacts } = space.db.query(Filter.schema(ContactType));
  const objectsByEmail = new Map<string, ContactType>();
  registerTypes(space);

  const getOrCreateContact = (recipient: RecipientType): ContactType | undefined => {
    invariant(recipient.email);
    let contact =
      objectsByEmail.get(recipient.email.toLowerCase()) ??
      contacts.find((contact) =>
        contact.identifiers.find(
          ({ type, value }) => type === 'email' && value && value.toLowerCase() === recipient.email?.toLowerCase(),
        ),
      );

    if (!contact) {
      contact = E.object(ContactType, {
        name: recipient.name,
        identifiers: [{ type: 'email', value: recipient.email }],
      });
      objectsByEmail.set(recipient.email.toLowerCase(), contact);
      space.db.add(contact);
    }

    i++;
    return contact;
  };

  let messages: MessageType[] = [];
  if (objects === undefined) {
    messages = space.db.query(Filter.schema(MessageType, { type: 'email' })).objects;
  } else if (objects.length) {
    // Only if undefined.
    messages = objects.filter(hasType(MessageType));
  }

  // Lookup contacts.
  for (const message of messages ?? []) {
    message.from.contact = getOrCreateContact(message.from);
    message.to?.forEach((to) => {
      to.contact = getOrCreateContact(to);
    });
    message.cc?.forEach((cc) => {
      cc.contact = getOrCreateContact(cc);
    });
  }

  // TODO(burdon): Auto-flush (in wrapper).
  // TODO(burdon): Causes recursion. Scheduler must check. Also check that there are NO mutations if nothing changed.
  log.info(`>>> ${i}`);
  await space.db.flush();
  log.info(`<<< ${i}`);
});
