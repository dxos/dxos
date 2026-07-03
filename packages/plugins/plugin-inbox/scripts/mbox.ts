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

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

import { type AddressObject, simpleParser } from 'mailparser';

import { Obj } from '@dxos/echo';
import { normalizeText } from '@dxos/markdown';
import { Message } from '@dxos/types';

/** Foreign-key source stamped on imported Takeout messages (cf. `GMAIL_SOURCE` for live sync). */
export const TAKEOUT_SOURCE = 'gmail-takeout';

/** A mapped message plus the Gmail labels to apply as tags after appending to the feed. */
export type MappedMessage = { message: Message.Message; labels: readonly string[] };

/**
 * Accumulates mbox lines into RFC-822 message strings, one line at a time, so both an in-memory
 * string (small fixtures/tests) and a streamed file (real Takeout exports, which can be several GB
 * — too large for a single JS string, see `buffer.constants.MAX_STRING_LENGTH`) share one
 * implementation of the mbox `From `-separator and `>From` body-unescaping rules.
 */
const createMboxAccumulator = () => {
  let current: string[] | undefined;

  const finish = (): string | undefined => {
    const message = current?.join('\n').trim();
    current = undefined;
    return message && message.length > 0 ? message : undefined;
  };

  /** Feeds one line; returns a completed message when a new envelope separator is reached. */
  const push = (line: string): string | undefined => {
    if (/^From /.test(line)) {
      const completed = finish();
      current = [];
      return completed;
    }
    if (current) {
      // Unescape mbox `>From ` / `>>From ` body quoting.
      current.push(/^>+From /.test(line) ? line.slice(1) : line);
    }
    return undefined;
  };

  return { push, flush: finish };
};

/** Splits a small, already-in-memory mbox string into individual RFC-822 message strings. */
export const splitMbox = (raw: string): string[] => {
  const accumulator = createMboxAccumulator();
  const messages: string[] = [];
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const message = accumulator.push(line);
    if (message) {
      messages.push(message);
    }
  }
  const last = accumulator.flush();
  if (last) {
    messages.push(last);
  }
  return messages;
};

/**
 * Streams a large mbox FILE line by line and yields each RFC-822 message as it completes — the file
 * is never held in memory as a whole, so this scales to multi-GB Takeout exports.
 */
export async function* streamMboxMessages(path: string): AsyncGenerator<string> {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  const accumulator = createMboxAccumulator();
  for await (const line of lines) {
    const message = accumulator.push(line);
    if (message) {
      yield message;
    }
  }
  const last = accumulator.flush();
  if (last) {
    yield last;
  }
}

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
