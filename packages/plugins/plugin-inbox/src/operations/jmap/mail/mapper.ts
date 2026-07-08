//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import { log } from '@dxos/log';
import { normalizeText } from '@dxos/markdown';
import { Message, Person } from '@dxos/types';

import { JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';

/**
 * Result of mapping a JMAP email. `mailboxIds` (the folders the email belongs to) is propagated
 * separately so the caller can apply folder tags to the immutable feed Message — mirrors the Gmail
 * mapper's `labelIds`.
 */
export type MappedEmail = { message: Message.Message; mailboxIds: readonly string[] };

/** A JMAP email with its extracted body text (may be HTML, not yet normalized). */
export type DecodedEmail = { raw: JmapMail.Email; body: string };

/**
 * Extracts the decoded body text from a JMAP email. Returns `null` when the email has no extractable
 * body. JMAP delivers decoded values, so (unlike Gmail) there is no base64 decoding; the HTML→markdown
 * normalization is a separate step so it can be shared across providers.
 */
export const decodeBody = (email: JmapMail.Email): DecodedEmail | null => {
  const body = getBodyText(email);
  if (!body) {
    log('jmap decodeBody: dropping email with no extractable body', {
      id: email.id,
      textBodyParts: email.textBody?.length ?? 0,
      bodyValues: email.bodyValues ? Object.keys(email.bodyValues).length : 0,
    });
    return null;
  }
  return { raw: email, body };
};

/**
 * Builds an ECHO Message from a decoded (already body-normalized) JMAP email and an optional resolved
 * sender contact. Pure — contact resolution is done by the caller. Returns `null` when the email has
 * no sender.
 */
export const mapToMessage = (decoded: DecodedEmail, contact: Person.Person | undefined): MappedEmail | null => {
  const { raw: email, body } = decoded;
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

    blocks: [
      {
        _tag: 'text',
        text: body,
        // JMAP sync converts the body to markdown (via the htmlToMarkdown stage) before mapping.
        mimeType: 'text/markdown',
      },
    ],
  });

  return { message: echoMessage, mailboxIds: email.mailboxIds ? Object.keys(email.mailboxIds) : [] };
};

/**
 * Maps a JMAP email to an ECHO Message, resolving the sender against existing contacts. Composes
 * {@link decodeBody} → `normalizeText` → {@link mapToMessage}. Returns `null` when the email has no
 * body or no sender.
 */
export const mapEmail: (email: JmapMail.Email) => Effect.Effect<MappedEmail | null, never, Resolver> =
  Effect.fnUntraced(function* (email) {
    const decoded = decodeBody(email);
    if (!decoded) {
      return null;
    }
    const fromAddress = email.from?.[0];
    const contact = fromAddress ? yield* resolve(Person.Person, { email: fromAddress.email }) : undefined;
    return mapToMessage({ ...decoded, body: normalizeText(decoded.body) }, contact ?? undefined);
  });

/** Formats a JMAP address as `"Name <email>"`, or just the address when unnamed. */
const formatAddress = (address: JmapMail.EmailAddress): string =>
  address.name ? `${address.name} <${address.email}>` : address.email;

/** Joins an address list into a header-style string, or `undefined` when empty. */
const formatAddresses = (addresses: readonly JmapMail.EmailAddress[] | null | undefined): string | undefined =>
  addresses && addresses.length > 0 ? addresses.map(formatAddress).join(', ') : undefined;

/**
 * Returns the decoded plain-text body. Prefers the `textBody` parts' values, then falls back to any
 * fetched `bodyValues` entry (e.g. an HTML-only message whose text alternative isn't referenced from
 * `textBody`). `Email/get` is requested with `fetchTextBodyValues`, so values are already decoded.
 */
const getBodyText = (email: JmapMail.Email): string | undefined => {
  for (const part of email.textBody ?? []) {
    const value = part.partId ? email.bodyValues?.[part.partId]?.value : undefined;
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  for (const bodyValue of Object.values(email.bodyValues ?? {})) {
    if (bodyValue.value.trim().length > 0) {
      return bodyValue.value;
    }
  }
  return undefined;
};
