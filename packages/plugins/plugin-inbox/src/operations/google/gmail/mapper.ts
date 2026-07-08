//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import { ContentBlock, Message, Person } from '@dxos/types';

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

/** A Gmail message with its raw HTML and/or plaintext body decoded to UTF-8 (no markdown processing). */
export type DecodedMessage = { raw: GoogleMail.Message; html?: string; plain?: string };

/**
 * Base64-decodes the message's HTML and plaintext bodies (whichever the email carries) to UTF-8.
 * Returns `null` when the message has neither. Pure and Gmail-specific; no HTML→markdown conversion —
 * the markdown/plain views derive from these raw blocks in the component.
 */
export const decodeBody = (message: GoogleMail.Message): DecodedMessage | null => {
  const decode = (data: string) => Buffer.from(data, 'base64').toString('utf-8');
  const htmlData = getPart(message, 'text/html');
  const plainData = getPart(message, 'text/plain');
  // Single-part messages carry the body directly on `payload.body`; the Content-Type header says which.
  const singleData = message.payload.parts?.length ? undefined : message.payload.body?.data;
  const isPlain = /text\/plain/i.test(
    message.payload.headers.find((header) => header.name.toLowerCase() === 'content-type')?.value ?? '',
  );
  const html = htmlData ? decode(htmlData) : singleData && !isPlain ? decode(singleData) : undefined;
  const plain = plainData ? decode(plainData) : singleData && isPlain ? decode(singleData) : undefined;
  if (html === undefined && plain === undefined) {
    return null;
  }
  return { raw: message, html, plain };
};

/**
 * Builds an ECHO message from a decoded Gmail message and an optional resolved sender contact. Pure —
 * contact resolution is done by the caller so this composes into a pipeline stage without a `Resolver`
 * requirement.
 */
export const mapToMessage = (decoded: DecodedMessage, contact: Person.Person | undefined): MappedMessage => {
  const { raw, html, plain } = decoded;
  const created = new Date(parseInt(raw.internalDate)).toISOString();

  const fromHeader = raw.payload.headers.find(({ name }) => name === 'From');
  const from = fromHeader && parseFromHeader(fromHeader.value);
  // TODO(wittjosiah): This comparison should be done via foreignId probably.
  const sender = { ...from, ...(contact ? { contact: Ref.make(contact) } : {}) };

  // Store the raw HTML and plaintext bodies as separately-typed blocks; the markdown view derives
  // from the HTML in-component.
  const blocks: ContentBlock.Text[] = [];
  if (html !== undefined) {
    blocks.push({ _tag: 'text', text: html, mimeType: 'text/html' });
  }
  if (plain !== undefined) {
    blocks.push({ _tag: 'text', text: plain, mimeType: 'text/plain' });
  }

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

    blocks,
  });

  return { message: echoMessage, labelIds: raw.labelIds ?? [] };
};

/**
 * Maps a Gmail message to an ECHO message object, resolving the sender against existing contacts.
 * Composes {@link decodeBody} → {@link mapToMessage}. Returns `null` when the message has no body.
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

    return mapToMessage(decoded, contact ?? undefined);
  });
