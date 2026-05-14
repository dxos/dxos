//
// Copyright 2026 DXOS.org
//

export interface ComposeInput {
  /** Bare email. */
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  /** Plaintext body. */
  text: string;
  /** Message-ID being replied to (with angle brackets). */
  inReplyTo?: string;
  /** Existing References header value (with angle brackets). */
  references?: string;
}

/**
 * Minimal RFC 5322 composer: text/plain only. Returns the wire-encoded message
 * along with the freshly-generated Message-ID so callers can persist it.
 * HTML alt-parts and attachments are future work.
 */
export const composeMessage = (input: ComposeInput): { rfc822: string; messageId: string } => {
  const messageId = `<${randomId()}@${input.from.split('@')[1] ?? 'localhost'}>`;
  const date = new Date().toUTCString().replace(/GMT$/, '+0000');

  const headers: string[] = [`From: ${input.from}`, `To: ${input.to.join(', ')}`];
  if (input.cc && input.cc.length > 0) {
    headers.push(`Cc: ${input.cc.join(', ')}`);
  }
  headers.push(
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  );
  if (input.inReplyTo) {
    headers.push(`In-Reply-To: ${input.inReplyTo}`);
    const references = input.references ? `${input.references} ${input.inReplyTo}` : input.inReplyTo;
    headers.push(`References: ${references}`);
  }

  const rfc822 = headers.join('\r\n') + '\r\n\r\n' + input.text;
  return { rfc822, messageId };
};

const randomId = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

/** Encode header value with MIME encoded-word if it contains non-ASCII. */
const encodeHeader = (v: string): string => {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7e]*$/.test(v)) {
    return v;
  }
  const b64 = btoa(unescape(encodeURIComponent(v)));
  return `=?UTF-8?B?${b64}?=`;
};
