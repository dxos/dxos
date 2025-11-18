//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { Message, Person } from '@dxos/types';

import { type GoogleMail } from '../../apis';

import { getPart, normalizeText, parseFromHeader } from './util';

/**
 * Transforms Gmail message to ECHO message object.
 */
export const mapMessage = Effect.fn(function* (message: GoogleMail.Message) {
  const created = new Date(parseInt(message.internalDate)).toISOString();

  const data = message.payload.body?.data ?? getPart(message, 'text/html') ?? getPart(message, 'text/plain');
  const fromHeader = message.payload.headers.find(({ name }) => name === 'From');
  const from = fromHeader && parseFromHeader(fromHeader.value);
  const { objects: contacts } = yield* DatabaseService.runQuery(Query.select(Filter.type(Person.Person)));
  const contact =
    from &&
    contacts.find(({ emails }) => {
      if (!emails) {
        return false;
      }

      return emails.findIndex(({ value }) => value === from.email) !== -1;
    });
  const sender = { ...from, contact: contact && Ref.make(contact) };

  // Skip the message if content or sender is missing.
  // TODO(wittjosiah): This comparison should be done via foreignId probably.
  if (!sender || !data) {
    return null;
  }

  // Normalize text.
  const text = normalizeText(Buffer.from(data, 'base64').toString('utf-8'));

  return Obj.make(
    Message.Message,
    {
      id: Type.ObjectId.random(),
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
