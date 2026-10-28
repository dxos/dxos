//
// Copyright 2026 DXOS.org
//

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

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

/** Writes raw messages as an mboxrd that {@link splitMbox} reads back: LF line ends, and one `>` added to every `>*From ` body line. */
export const joinMbox = (messages: readonly string[]): string =>
  messages
    .map((message) => {
      const escaped = message
        .replace(/\r\n/g, '\n')
        .replace(/^(>*From )/gm, '>$1')
        .replace(/\n*$/, '\n');
      return `From MAILER-DAEMON Thu Jan  1 00:00:00 1970\n${escaped}`;
    })
    .join('\n');
