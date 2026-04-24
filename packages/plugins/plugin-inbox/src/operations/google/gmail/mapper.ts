//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { Message, Person } from '@dxos/types';

import { type GoogleMail } from '../../../apis';
import { resolve, type Resolver } from '../../../services/resolver';
import { normalizeText, parseFromHeader } from '../util';

const getPart = (message: GoogleMail.Message, part: string) =>
  message.payload.parts?.find(({ mimeType }) => mimeType === part)?.body.data;

/** Decodes common HTML entities in Gmail snippet/header text (e.g., `&#39;` → `'`). */
const decodeHtmlEntities = (text: string | undefined): string | undefined => {
  if (text === undefined) {
    return undefined;
  }

  let result = text;
  for (let iteration = 0; iteration < 10 && result.includes('&amp;'); iteration++) {
    result = result.replace(/&amp;/gi, '&');
  }

  result = result
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCharCode(Number.parseInt(decimal, 10)))
    .replace(/&#x([\da-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));

  const named: Record<string, string> = { quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00A0' };
  for (const [name, char] of Object.entries(named)) {
    result = result.replace(new RegExp(`&${name};`, 'gi'), char);
  }

  return result;
};

/**
 * Maps Gmail message to ECHO message object.
 */
export const mapMessage: (message: GoogleMail.Message) => Effect.Effect<Message.Message | null, never, Resolver> =
  Effect.fnUntraced(function* (message) {
    const created = new Date(parseInt(message.internalDate)).toISOString();

    const data = message.payload.body?.data ?? getPart(message, 'text/html') ?? getPart(message, 'text/plain');
    const fromHeader = message.payload.headers.find(({ name }) => name === 'From');
    const from = fromHeader && parseFromHeader(fromHeader.value);

    const contact = from && (yield* resolve(Person.Person, { email: from.email }));

    // Skip the message if content or sender is missing.
    // TODO(wittjosiah): This comparison should be done via foreignId probably.
    const sender = { ...from, ...(contact ? { contact: Ref.make(contact) } : {}) };
    if (!sender || !data) {
      return null;
    }

    // Normalize text.
    const text = normalizeText(Buffer.from(data, 'base64').toString('utf-8'));

    return Obj.make(Message.Message, {
      [Obj.Meta]: {
        keys: [{ id: message.id, source: 'gmail.com' }],
      },

      created,
      sender,
      threadId: message.threadId,

      properties: {
        threadId: message.threadId,
        snippet: decodeHtmlEntities(message.snippet),
        subject: decodeHtmlEntities(message.payload.headers.find(({ name }) => name === 'Subject')?.value),
        labels: message.labelIds,
        messageId: message.payload.headers.find(({ name }) => name === 'Message-ID')?.value,
        references: message.payload.headers.find(({ name }) => name === 'References')?.value,
        to: message.payload.headers.find(({ name }) => name === 'To')?.value,
        cc: message.payload.headers.find(({ name }) => name === 'Cc')?.value,
      },

      blocks: [
        {
          _tag: 'text',
          text,
        },
      ],
    });
  });
