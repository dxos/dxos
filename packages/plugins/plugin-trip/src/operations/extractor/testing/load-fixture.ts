//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { normalizeText } from '@dxos/markdown';
import { ContentBlock, Message } from '@dxos/types';

/**
 * Parses a fixture-email string (loaded via Vite's `?raw` suffix) into a
 * `Message.Message` that mirrors the shape Gmail-imported messages take in
 * production. Fixtures use a minimal RFC-822-ish format: a header block
 * (`Key: value` lines) followed by a blank line and the body. Recognised
 * headers are `From:` (mapped to `sender.email`) and `Subject:` (mapped to
 * `properties.subject`). The body may be plain text, markdown, or raw HTML —
 * `@dxos/markdown`'s `normalizeText` runs the same HTML→Markdown
 * conversion the Gmail mapper applies before storing the message, so paste
 * the email body straight from your inbox's "View source" / "Show original".
 *
 * Paste real email content into the `.md` files in this directory to extend
 * fixture coverage; one file = one `Message`.
 */
export const parseFixtureMessage = (raw: string): Message.Message => {
  // Normalise CRLF / CR (raw email sources from "Show original" frequently use \r\n) so the
  // blank-line split and header parsing don't depend on platform line endings.
  const normalised = raw.replace(/\r\n?/g, '\n');
  const blankLineIndex = normalised.indexOf('\n\n');
  const headerBlock = blankLineIndex >= 0 ? normalised.slice(0, blankLineIndex) : '';
  const body = blankLineIndex >= 0 ? normalised.slice(blankLineIndex + 2) : normalised;

  const headers = new Map<string, string>();
  for (const line of headerBlock.split('\n')) {
    const colon = line.indexOf(':');
    if (colon <= 0) {
      continue;
    }
    headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }

  return Obj.make(Message.Message, {
    created: new Date('2026-05-25T00:00:00.000Z').toISOString(),
    sender: { email: headers.get('from') ?? '' },
    properties: { subject: headers.get('subject') ?? '' },
    blocks: [ContentBlock.Text.make({ text: normalizeText(body) })],
  });
};
