//
// Copyright 2026 DXOS.org
//

/**
 * Pure mbox → ECHO Message mapping, out of band from the app.
 *
 * Gmail Takeout exports each label as a large RFC-822 `.mbox` file. Messages carry Gmail's own
 * headers (`X-GM-THRID`, `X-Gmail-Labels`, `Message-ID`) which map onto `threadId` / tags / the
 * dedup key. The produced `Message` shape mirrors the live Gmail sync mapper
 * (`src/operations/google/gmail/mapper.ts`) so imported data is indistinguishable from synced data.
 *
 * `mailparser` is a devDependency: this module is only reached by the import script, never bundled.
 */

import { type AddressObject, simpleParser } from 'mailparser';

import { Obj } from '@dxos/echo';
import { normalizeText } from '@dxos/markdown';
import { Message } from '@dxos/types';

/** Foreign-key source stamped on imported Takeout messages (cf. `GMAIL_SOURCE` for live sync). */
export const TAKEOUT_SOURCE = 'gmail-takeout';

/** A mapped message plus the Gmail labels to apply as tags after appending to the feed. */
export type MappedMessage = { message: Message.Message; labels: readonly string[] };

/**
 * Splits a raw mbox file into individual RFC-822 message strings.
 *
 * mbox separates messages with a `From ` line (note the trailing space) at the start of a line, and
 * escapes any body line beginning with `From ` by prefixing `>` (and `>From` as `>>From`, etc.). We
 * split on the separator and unescape the quoting so each chunk is a faithful RFC-822 message.
 */
export const splitMbox = (raw: string): string[] => {
  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const messages: string[] = [];
  let current: string[] | undefined;

  const isSeparator = (line: string) => /^From /.test(line);

  for (const line of lines) {
    if (isSeparator(line)) {
      if (current) {
        messages.push(current.join('\n'));
      }
      current = [];
      continue; // Drop the `From ` envelope line itself.
    }
    if (current) {
      // Unescape mbox `>From ` / `>>From ` body quoting.
      current.push(/^>+From /.test(line) ? line.slice(1) : line);
    }
  }
  if (current) {
    messages.push(current.join('\n'));
  }

  return messages.map((message) => message.trim()).filter((message) => message.length > 0);
};

/** Formats an mailparser address object as a raw header string (e.g. `Name <email>, ...`). */
const formatAddress = (address: AddressObject | AddressObject[] | undefined): string | undefined => {
  if (!address) {
    return undefined;
  }
  const list = Array.isArray(address) ? address : [address];
  const text = list
    .map((entry) => entry.text)
    .filter(Boolean)
    .join(', ');
  return text.length > 0 ? text : undefined;
};

/** Reads a header value regardless of case (mailparser lowercases header keys). */
const header = (headers: ReadonlyMap<string, unknown>, name: string): string | undefined => {
  const value = headers.get(name.toLowerCase());
  return typeof value === 'string' ? value : undefined;
};

/**
 * Maps a single raw RFC-822 message into an ECHO `Message`, mirroring the Gmail sync mapper.
 *
 * Returns `null` when the message has no sender or no body (parity with the live mapper's skip rule).
 */
export const mapMboxMessage = async (raw: string): Promise<MappedMessage | null> => {
  const parsed = await simpleParser(raw);

  const from = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
  const fromAddress = from?.value?.[0];
  const email = fromAddress?.address;
  if (!email) {
    return null;
  }

  // Gmail prefers HTML then plaintext; `normalizeText` converts HTML → Markdown, else passes through.
  const body = parsed.html || parsed.text;
  if (!body) {
    return null;
  }
  const text = normalizeText(body);

  const created = (parsed.date ?? new Date(0)).toISOString();
  const threadId = header(parsed.headers, 'x-gm-thrid');
  const messageId = parsed.messageId ?? header(parsed.headers, 'message-id');
  const references = Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references;
  const labels = (header(parsed.headers, 'x-gmail-labels') ?? '')
    .split(',')
    .map((label) => label.trim())
    .filter((label) => label.length > 0);

  const message = Obj.make(Message.Message, {
    ...(messageId ? { [Obj.Meta]: { keys: [{ id: messageId, source: TAKEOUT_SOURCE }] } } : {}),

    created,
    sender: { name: fromAddress.name || undefined, email },
    threadId,

    properties: {
      threadId,
      snippet: parsed.text?.slice(0, 200),
      subject: parsed.subject,
      messageId,
      references,
      to: formatAddress(parsed.to),
      cc: formatAddress(parsed.cc),
      labels,
    },

    blocks: [{ _tag: 'text', text }],
  });

  return { message, labels };
};
