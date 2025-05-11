//
// Copyright 2023 DXOS.org
//

import { live, Ref } from '@dxos/client/echo';
import { Filter, hasType } from '@dxos/echo-db';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

export const handler = subscriptionHandler(async ({ event }) => {
  const { space, objects } = event.data;
  invariant(space);

  const { objects: contacts } = await space.db.query(Filter.schema(DataType.Person)).run();
  const objectsByEmail = new Map<string, DataType.Person>();

  let i = 0;
  const getOrCreateContact = (recipient: DataType.Actor): DataType.Person => {
    invariant(recipient.email);
    let contact =
      objectsByEmail.get(recipient.email.toLowerCase()) ??
      contacts.find((contact) =>
        contact.identifiers.find(
          ({ type, value }) => type === 'email' && value && value.toLowerCase() === recipient.email?.toLowerCase(),
        ),
      );

    if (!contact) {
      contact = live(ContactType, {
        name: recipient.name,
        identifiers: [{ type: 'email', value: recipient.email }],
      });
      objectsByEmail.set(recipient.email.toLowerCase(), contact);
      space.db.add(contact);
    }

    i++;
    return contact;
  };

  let messages: DataType.Message[] = [];
  if (objects === undefined) {
    messages = (await space.db.query(Filter.schema(DataType.Message, { type: 'email' }))).objects;
  } else if (objects.length) {
    // Only if undefined.
    messages = objects.filter(hasType(DataType.Message));
  }

  // Lookup contacts.
  for (const message of messages ?? []) {
    message.sender.contact = Ref.make(getOrCreateContact(message.sender));
    message.properties?.to?.forEach((to: ActorType) => {
      to.contact = Ref.make(getOrCreateContact(to));
    });
    message.properties?.cc?.forEach((cc: ActorType) => {
      cc.contact = Ref.make(getOrCreateContact(cc));
    });
  }

  // TODO(burdon): Auto-flush (in wrapper).
  // TODO(burdon): Causes recursion. Scheduler must check. Also check that there are NO mutations if nothing changed.
  log.info(`>>> ${i}`);
  await space.db.flush();
  log.info(`<<< ${i}`);
}, types);
