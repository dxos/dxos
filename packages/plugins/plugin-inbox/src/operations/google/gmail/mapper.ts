//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import { normalizeText } from '@dxos/markdown';
import { Message, Person } from '@dxos/types';

import { type GoogleMail } from '../../../apis';
import { GMAIL_SOURCE } from '../../../constants';
import { parseFromHeader } from '../../util';

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

/** Result of mapping a Gmail message. `labelIds` is propagated separately so the caller can
 * apply tags via `mailbox.tags[labelId].messages` after appending to the feed — feed-stored
 * Messages are immutable, so per-message tag membership has to live on the (mutable) Mailbox.
 */
export type MappedMessage = { message: Message.Message; labelIds: readonly string[] };

/** A Gmail message with its body decoded to a UTF-8 string (HTML or plaintext, not yet normalized). */
export type DecodedMessage = { raw: GoogleMail.Message; body: string };

/**
 * Selects and base64-decodes the message body (HTML preferred, then plaintext) to a UTF-8 string.
 * Returns `null` when the message carries no body. Pure and Gmail-specific; the HTML→markdown
 * normalization is a separate step so it can be shared across providers.
 */
export const decodeBody = (message: GoogleMail.Message): DecodedMessage | null => {
  const data = message.payload.body?.data ?? getPart(message, 'text/html') ?? getPart(message, 'text/plain');
  if (!data) {
    return null;
  }
  return { raw: message, body: Buffer.from(data, 'base64').toString('utf-8') };
};

/**
 * Builds an ECHO message from a decoded (already body-normalized) Gmail message and an optional
 * resolved sender contact. Pure — contact resolution is done by the caller so this composes into a
 * pipeline stage without a `Resolver` requirement.
 */
export const mapToMessage = (decoded: DecodedMessage, contact: Person.Person | undefined): MappedMessage => {
  const { raw, body } = decoded;
  const created = new Date(parseInt(raw.internalDate)).toISOString();

  const fromHeader = raw.payload.headers.find(({ name }) => name === 'From');
  const from = fromHeader && parseFromHeader(fromHeader.value);
  // TODO(wittjosiah): This comparison should be done via foreignId probably.
  const sender = { ...from, ...(contact ? { contact: Ref.make(contact) } : {}) };

  const echoMessage = Obj.make(Message.Message, {
    [Obj.Meta]: {
      keys: [{ id: raw.id, source: GMAIL_SOURCE }],
    },

    created,
    sender,
    threadId: raw.threadId,

    properties: {
      threadId: raw.threadId,
      snippet: decodeHtmlEntities(raw.snippet),
      subject: decodeHtmlEntities(raw.payload.headers.find(({ name }) => name === 'Subject')?.value),
      messageId: raw.payload.headers.find(({ name }) => name === 'Message-ID')?.value,
      references: raw.payload.headers.find(({ name }) => name === 'References')?.value,
      to: raw.payload.headers.find(({ name }) => name === 'To')?.value,
      cc: raw.payload.headers.find(({ name }) => name === 'Cc')?.value,
    },

    blocks: [
      {
        _tag: 'text',
        text: body,
      },
    ],
  });

  return { message: echoMessage, labelIds: raw.labelIds ?? [] };
};

/**
 * Maps a Gmail message to an ECHO message object, resolving the sender against existing contacts.
 * Composes {@link decodeBody} → `normalizeText` → {@link mapToMessage}. Returns `null` when the
 * message has no body.
 */
export const mapMessage: (message: GoogleMail.Message) => Effect.Effect<MappedMessage | null, never, Resolver> =
  Effect.fnUntraced(function* (message) {
    const decoded = decodeBody(message);
    if (!decoded) {
      return null;
    }

    const fromHeader = message.payload.headers.find(({ name }) => name === 'From');
    const from = fromHeader && parseFromHeader(fromHeader.value);
    const contact = from ? yield* resolve(Person.Person, { email: from.email }) : undefined;

    return mapToMessage({ ...decoded, body: normalizeText(decoded.body) }, contact ?? undefined);
  });
