//
// Copyright 2023 DXOS.org
//

import { create, makeRef } from '@dxos/client/echo';
import { Filter, hasType } from '@dxos/echo-db';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ContactType, MessageType, type ActorType } from '@dxos/plugin-space/types';
import { TextType } from '@dxos/schema';

const types = [TextType, ContactType, MessageType];

export const handler = subscriptionHandler(async ({ event }) => {
  const { space, objects } = event.data;
  invariant(space);

  const { objects: contacts } = await space.db.query(Filter.schema(ContactType)).run();
  const objectsByEmail = new Map<string, ContactType>();

  let i = 0;
  const getOrCreateContact = (recipient: ActorType): ContactType => {
    invariant(recipient.email);
    let contact =
      objectsByEmail.get(recipient.email.toLowerCase()) ??
      contacts.find((contact) =>
        contact.identifiers.find(
          ({ type, value }) => type === 'email' && value && value.toLowerCase() === recipient.email?.toLowerCase(),
        ),
      );

    if (!contact) {
      contact = create(ContactType, {
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
    messages = (await space.db.query(Filter.schema(MessageType, { type: 'email' }))).objects;
  } else if (objects.length) {
    // Only if undefined.
    messages = objects.filter(hasType(MessageType));
  }

  // Lookup contacts.
  for (const message of messages ?? []) {
    message.sender.contact = makeRef(getOrCreateContact(message.sender));
    message.properties?.to?.forEach((to: ActorType) => {
      to.contact = makeRef(getOrCreateContact(to));
    });
    message.properties?.cc?.forEach((cc: ActorType) => {
      cc.contact = makeRef(getOrCreateContact(cc));
    });
  }

  // TODO(burdon): Auto-flush (in wrapper).
  // TODO(burdon): Causes recursion. Scheduler must check. Also check that there are NO mutations if nothing changed.
  log.info(`>>> ${i}`);
  await space.db.flush();
  log.info(`<<< ${i}`);
}, types);
