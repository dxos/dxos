//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import { log } from '@dxos/log';
import { normalizeText } from '@dxos/markdown';
import { ContentBlock, Message, Person } from '@dxos/types';

import { type GoogleMail } from '../../../apis';
import { GMAIL_SOURCE } from '../../../constants';
import { parseFromHeader } from '../../util';

/**
 * Recursively searches a message's MIME part tree for the first part matching `mimeType`, depth-first
 * so an early sibling's subtree (e.g. `multipart/alternative`) is fully explored before a later one
 * (e.g. a forwarded `message/rfc822` attachment) — nested one or more levels deep whenever the message
 * carries an inline image or attachment (common for `multipart/related`/`multipart/mixed` wrappers),
 * not just at the top level of `payload.parts`.
 */
const findPartData = (parts: readonly GoogleMail.Part[] | undefined, mimeType: string): string | undefined => {
  for (const part of parts ?? []) {
    if (part.mimeType === mimeType && part.body.data) {
      return part.body.data;
    }
    const nested = findPartData(part.parts, mimeType);
    if (nested) {
      return nested;
    }
  }
  return undefined;
};

const getPart = (message: GoogleMail.Message, mimeType: string): string | undefined =>
  findPartData(message.payload.parts, mimeType);

/** Metadata for an attachment part (a leaf part carrying `filename` and `body.attachmentId`). */
export type AttachmentMetadata = {
  readonly filename?: string;
  readonly attachmentId: string;
  readonly mimeType: string;
  readonly size: number;
  /** The part's `Content-ID` header (angle brackets stripped), if any — matches a `cid:` reference in an HTML body. */
  readonly contentId?: string;
};

/** Reads a part's `Content-ID` header, stripping the enclosing `<...>` so it matches an HTML `cid:` reference. */
const getContentId = (part: GoogleMail.Part): string | undefined =>
  part.headers?.find((header) => header.name.toLowerCase() === 'content-id')?.value.replace(/^<|>$/g, '');

/** Recursively collects attachment metadata from a message's MIME part tree. */
const collectAttachments = (parts: readonly GoogleMail.Part[] | undefined): AttachmentMetadata[] => {
  const attachments: AttachmentMetadata[] = [];
  for (const part of parts ?? []) {
    if (part.filename && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        attachmentId: part.body.attachmentId,
        mimeType: part.mimeType,
        size: part.body.size,
        contentId: getContentId(part),
      });
    }
    attachments.push(...collectAttachments(part.parts));
  }
  return attachments;
};

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
export type DecodedMessage = {
  raw: GoogleMail.Message;
  html?: string;
  plain?: string;
  attachments: readonly AttachmentMetadata[];
};

/**
 * Base64-decodes the message's HTML and plaintext bodies (whichever the email carries) to UTF-8.
 * Returns `null` when the message has neither. Pure and Gmail-specific; no HTML→markdown conversion —
 * the markdown/plain views derive from these raw blocks in the component.
 */
export const decodeBody = (message: GoogleMail.Message): DecodedMessage | null => {
  const decode = (data: string) => Buffer.from(data, 'base64').toString('utf-8');
  // A part that decodes to whitespace (or nothing) is treated as absent: some senders emit an empty
  // `text/plain` alternative alongside the real HTML. Coercing it to `undefined` lets such messages
  // fall through to the HTML→markdown synthesis in `mapToMessage` instead of storing a blank body.
  const nonEmpty = (text: string | undefined): string | undefined =>
    text !== undefined && text.trim().length > 0 ? text : undefined;
  const htmlData = getPart(message, 'text/html');
  const plainData = getPart(message, 'text/plain');
  // Single-part messages carry the body directly on `payload.body`; the Content-Type header says which.
  const singleData = message.payload.parts?.length ? undefined : message.payload.body?.data;
  const isPlain = /text\/plain/i.test(
    message.payload.headers.find((header) => header.name.toLowerCase() === 'content-type')?.value ?? '',
  );
  const html = nonEmpty(htmlData ? decode(htmlData) : singleData && !isPlain ? decode(singleData) : undefined);
  const plain = nonEmpty(plainData ? decode(plainData) : singleData && isPlain ? decode(singleData) : undefined);
  if (html === undefined && plain === undefined) {
    log('gmail decodeBody: dropping message with no extractable body', {
      id: message.id,
      threadId: message.threadId,
      mimeType: message.payload.headers.find((header) => header.name.toLowerCase() === 'content-type')?.value,
      partCount: message.payload.parts?.length ?? 0,
    });
    return null;
  }
  return { raw: message, html, plain, attachments: collectAttachments(message.payload.parts) };
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
  // HTML-only messages carry no readable body for consumers that don't render HTML (search, LLM
  // pipelines, the plain view). Synthesize a markdown block from the HTML so every message has a
  // clean text body regardless of the parts the sender provided.
  if (plain === undefined && html !== undefined) {
    blocks.push({ _tag: 'text', text: normalizeText(html), mimeType: 'text/markdown' });
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
