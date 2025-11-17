//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Type } from '@dxos/echo';
import { Message } from '@dxos/types';

import { type GoogleMail } from '../../apis';

import { getPart, normalizeText, parseFromHeader } from './util';

/**
 * Transforms Gmail message to ECHO message object.
 */
export const mapMessage = Effect.fn(function* (message: GoogleMail.Message) {
  const created = new Date(parseInt(message.internalDate)).toISOString();

  const from = message.payload.headers.find(({ name }) => name === 'From');
  const sender = from && parseFromHeader(from.value);
  const data = message.payload.body?.data ?? getPart(message, 'text/html') ?? getPart(message, 'text/plain');

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
