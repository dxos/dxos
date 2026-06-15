//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, test } from 'vitest';

import { normalizeText } from '@dxos/markdown';

/**
 * Decode a quoted-printable encoded string (RFC 2045) into UTF-8 text.
 * Soft line breaks (`=\r?\n`) are removed and `=XX` escapes are decoded at the byte level so
 * multi-byte UTF-8 sequences split across escapes round-trip correctly.
 */
const decodeQuotedPrintable = (input: string): string => {
  const collapsed = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < collapsed.length; i++) {
    const ch = collapsed[i];
    if (ch === '=' && i + 2 < collapsed.length) {
      bytes.push(Number.parseInt(collapsed.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(ch.charCodeAt(0));
    }
  }
  return Buffer.from(bytes).toString('utf-8');
};

/** Extract and decode the HTML body of a raw RFC 822 `.eml` message (quoted-printable transfer encoding). */
const extractHtmlBody = (raw: string): string => {
  const boundary = raw.search(/\r?\n\r?\n/);
  const body = raw.slice(boundary).replace(/^\r?\n\r?\n/, '');
  return decodeQuotedPrintable(body);
};

const loadFixture = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`./data/${name}`, import.meta.url)), 'utf-8');

describe('email markdown', () => {
  test('notion update notification', ({ expect }) => {
    const html = extractHtmlBody(loadFixture('notion.eml'));
    const markdown = normalizeText(html);
    expect(markdown).toEqual(loadFixture('notion.md').trimEnd());
  });
});
