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

/**
 * Maps a JMAP email to an ECHO Message. JMAP gives structured addresses and decoded body text, so
 * (unlike Gmail) there is no header parsing or base64 decoding. Returns `null` when the email has no
 * sender or no text body.
 */
export const mapEmail: (email: JmapMail.Email) => Effect.Effect<MappedEmail | null, never, Resolver> =
  Effect.fnUntraced(function* (email) {
    const fromAddress = email.from?.[0];
    if (!fromAddress) {
      log('jmap mapEmail: dropping email with no sender', { id: email.id });
      return null;
    }

    const contact = yield* resolve(Person.Person, { email: fromAddress.email });

    // Omit `contact` entirely when unresolved: an explicit `undefined` round-trips to `null` and
    // fails Message schema validation on queue load (see mapper.test.ts).
    const sender = {
      email: fromAddress.email,
      ...(fromAddress.name ? { name: fromAddress.name } : {}),
      ...(contact ? { contact: Ref.make(contact) } : {}),
    };

    const body = getBodyText(email);
    if (!body) {
      log('jmap mapEmail: dropping email with no extractable body', {
        id: email.id,
        textBodyParts: email.textBody?.length ?? 0,
        bodyValues: email.bodyValues ? Object.keys(email.bodyValues).length : 0,
      });
      return null;
    }
    const text = normalizeText(body);

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
          text,
        },
      ],
    });

    return { message: echoMessage, mailboxIds: email.mailboxIds ? Object.keys(email.mailboxIds) : [] };
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
