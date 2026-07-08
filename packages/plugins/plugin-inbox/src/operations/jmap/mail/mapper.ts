//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import { log } from '@dxos/log';
import { ContentBlock, Message, Person } from '@dxos/types';

import { JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';

/**
 * Result of mapping a JMAP email. `mailboxIds` (the folders the email belongs to) is propagated
 * separately so the caller can apply folder tags to the immutable feed Message — mirrors the Gmail
 * mapper's `labelIds`.
 */
export type MappedEmail = { message: Message.Message; mailboxIds: readonly string[] };

/** A JMAP email with its raw HTML and/or plaintext body (JMAP delivers decoded values; no markdown). */
export type DecodedEmail = { raw: JmapMail.Email; html?: string; plain?: string };

/**
 * Extracts the raw HTML and plaintext bodies from a JMAP email (values fetched via
 * `fetchHTMLBodyValues`/`fetchTextBodyValues`). Returns `null` when the email has neither. No
 * HTML→markdown conversion — the markdown/plain views derive from these raw blocks in the component.
 */
export const decodeBody = (email: JmapMail.Email): DecodedEmail | null => {
  const html = getBodyValue(email, email.htmlBody);
  const plain = getBodyValue(email, email.textBody);
  if (html === undefined && plain === undefined) {
    log('jmap decodeBody: dropping email with no extractable body', {
      id: email.id,
      htmlBodyParts: email.htmlBody?.length ?? 0,
      textBodyParts: email.textBody?.length ?? 0,
      bodyValues: email.bodyValues ? Object.keys(email.bodyValues).length : 0,
    });
    return null;
  }
  return { raw: email, html, plain };
};

/**
 * Builds an ECHO Message from a decoded (already body-normalized) JMAP email and an optional resolved
 * sender contact. Pure — contact resolution is done by the caller. Returns `null` when the email has
 * no sender.
 */
export const mapToMessage = (decoded: DecodedEmail, contact: Person.Person | undefined): MappedEmail | null => {
  const { raw: email, html, plain } = decoded;
  const fromAddress = email.from?.[0];
  if (!fromAddress) {
    log('jmap mapToMessage: dropping email with no sender', { id: email.id });
    return null;
  }

  // Omit `contact` entirely when unresolved: an explicit `undefined` round-trips to `null` and
  // fails Message schema validation on queue load (see mapper.test.ts).
  const sender = {
    email: fromAddress.email,
    ...(fromAddress.name ? { name: fromAddress.name } : {}),
    ...(contact ? { contact: Ref.make(contact) } : {}),
  };

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
      keys: [{ id: email.id, source: JMAP_MESSAGE_SOURCE }],
    },

    created: email.receivedAt,
    sender,
    ...(email.threadId ? { threadId: email.threadId } : {}),

    properties: {
      threadId: email.threadId,
      // `snippet` is the field inbox UI renders for previews; JMAP's `preview` is its analogue.
      snippet: email.preview ?? undefined,
      subject: email.subject ?? undefined,
      messageId: email.messageId?.[0],
      inReplyTo: email.inReplyTo?.[0],
      references: email.references?.join(' '),
      to: formatAddresses(email.to),
      cc: formatAddresses(email.cc),
    },

    blocks,
  });

  return { message: echoMessage, mailboxIds: email.mailboxIds ? Object.keys(email.mailboxIds) : [] };
};

/**
 * Maps a JMAP email to an ECHO Message, resolving the sender against existing contacts. Composes
 * {@link decodeBody} → {@link mapToMessage}. Returns `null` when the email has no body or no sender.
 */
export const mapEmail: (email: JmapMail.Email) => Effect.Effect<MappedEmail | null, never, Resolver> =
  Effect.fnUntraced(function* (email) {
    const decoded = decodeBody(email);
    if (!decoded) {
      return null;
    }
    const fromAddress = email.from?.[0];
    const contact = fromAddress ? yield* resolve(Person.Person, { email: fromAddress.email }) : undefined;
    return mapToMessage(decoded, contact ?? undefined);
  });

/** Formats a JMAP address as `"Name <email>"`, or just the address when unnamed. */
const formatAddress = (address: JmapMail.EmailAddress): string =>
  address.name ? `${address.name} <${address.email}>` : address.email;

/** Joins an address list into a header-style string, or `undefined` when empty. */
const formatAddresses = (addresses: readonly JmapMail.EmailAddress[] | null | undefined): string | undefined =>
  addresses && addresses.length > 0 ? addresses.map(formatAddress).join(', ') : undefined;

/**
 * Returns the first non-empty decoded value among the given body parts (e.g. `email.htmlBody` or
 * `email.textBody`). `Email/get` is requested with `fetchHTMLBodyValues`/`fetchTextBodyValues`, so the
 * referenced `bodyValues` are already decoded.
 */
const getBodyValue = (
  email: JmapMail.Email,
  parts: readonly JmapMail.EmailBodyPart[] | undefined,
): string | undefined => {
  for (const part of parts ?? []) {
    const value = part.partId ? email.bodyValues?.[part.partId]?.value : undefined;
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};
