//
// Copyright 2026 DXOS.org
//

/** Header that maps a seeded copy back to the pool message it was copied from. */
export const SEED_HEADER = 'X-Dx-Seed';

/** Headers the copy replaces; `Bcc` is dropped so a copy never names a hidden recipient. */
const REPLACED_HEADERS = new Set(['date', 'message-id', SEED_HEADER.toLowerCase(), 'bcc']);

export type SeedCopyOptions = {
  /** Gmail id of the pool message being copied. */
  readonly poolId: string;
  /** When the copy is made; becomes its `Date`. */
  readonly now: Date;
  /** Distinguishes copies of the same pool message made on different runs. */
  readonly nonce: string;
};

/**
 * Rewrites a raw RFC 5322 message into a fresh seed copy: a new `Date`, a new `Message-ID` and an
 * `X-Dx-Seed` header naming the pool message, with the body untouched.
 *
 * The `Message-ID` must change because Gmail may drop an inserted message whose id it has already
 * seen, which would make the copy silently vanish.
 */
export const makeSeedCopy = (raw: string, { poolId, now, nonce }: SeedCopyOptions): string => {
  const { headerLines, separator, body, newline } = splitMessage(raw);
  const kept = groupHeaders(headerLines).filter((header) => !REPLACED_HEADERS.has(headerName(header[0])));
  const added = [
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${poolId}.${nonce}@canary.dxos.org>`,
    `${SEED_HEADER}: ${poolId}`,
  ];
  return [...added, ...kept.flat()].join(newline) + separator + body;
};

/** Reads one header's value (first occurrence, unfolded) from a raw message, or undefined. */
export const readHeader = (raw: string, name: string): string | undefined => {
  const { headerLines } = splitMessage(raw);
  const header = groupHeaders(headerLines).find((lines) => headerName(lines[0]) === name.toLowerCase());
  if (!header) {
    return undefined;
  }
  const [first, ...rest] = header;
  return [first.slice(first.indexOf(':') + 1), ...rest].map((line) => line.trim()).join(' ');
};

type SplitMessage = { headerLines: string[]; separator: string; body: string; newline: string };

const splitMessage = (raw: string): SplitMessage => {
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const separator = newline + newline;
  const index = raw.indexOf(separator);
  const head = index === -1 ? raw : raw.slice(0, index);
  const body = index === -1 ? '' : raw.slice(index + separator.length);
  return { headerLines: head.split(newline), separator, body, newline };
};

/** Groups physical lines into headers, keeping each folded continuation line with its header. */
const groupHeaders = (lines: string[]): string[][] =>
  lines.reduce<string[][]>((headers, line) => {
    const isContinuation = (line.startsWith(' ') || line.startsWith('\t')) && headers.length > 0;
    if (isContinuation) {
      headers[headers.length - 1].push(line);
    } else if (line.length > 0) {
      headers.push([line]);
    }
    return headers;
  }, []);

const headerName = (line: string): string =>
  line
    .slice(0, Math.max(0, line.indexOf(':')))
    .trim()
    .toLowerCase();
