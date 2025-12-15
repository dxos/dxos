//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { Message, Person } from '@dxos/types';

import { type GoogleMail } from '../../apis';
import { Resolver } from '../../resolver';
import { getPart, normalizeText, parseFromHeader } from '../../util';

/**
 * Maps Gmail message to ECHO message object.
 */
export const mapMessage = Effect.fn(function* (message: GoogleMail.Message) {
  const created = new Date(parseInt(message.internalDate)).toISOString();

  const data = message.payload.body?.data ?? getPart(message, 'text/html') ?? getPart(message, 'text/plain');
  const fromHeader = message.payload.headers.find(({ name }) => name === 'From');
  const from = fromHeader && parseFromHeader(fromHeader.value);

  const contact = from && (yield* Resolver.resolve(Person.Person, { email: from.email }));

  // Skip the message if content or sender is missing.
  // TODO(wittjosiah): This comparison should be done via foreignId probably.
  const sender = { ...from, contact: contact && Ref.make(contact) };
  if (!sender || !data) {
    return null;
  }

  // Normalize text.
  const text = normalizeText(Buffer.from(data, 'base64').toString('utf-8'));

  return Obj.make(
    Message.Message,
    {
      id: Obj.ID.random(),
      created,
      sender,
      blocks: [
        {
          _tag: 'text',
          text,
        },
      ],
      properties: {
        threadId: message.threadId,
        snippet: message.snippet,
        subject: message.payload.headers.find(({ name }) => name === 'Subject')?.value,
        labels: message.labelIds,
      },
    },
    {
      keys: [{ id: message.id, source: 'gmail.com' }],
    },
  );
});
