//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SEED_HEADER, decodeRaw, encodeRaw, makeSeedCopy, readHeader } from './seed-copy.ts';

const POOL_MESSAGE = [
  'Message-ID: <12345.JavaMail.evans@thyme>',
  'Date: Mon, 14 May 2001 16:39:00 -0700 (PDT)',
  'From: phillip.allen@enron.com',
  'To: tim.belden@enron.com',
  'Bcc: hidden@enron.com',
  'Subject: Re: forecast for',
  '\tthe west desk',
  'X-Folder: \\Phillip_Allen_Jan2002_1\\Allen, Phillip K.\\Sent Mail',
  '',
  'Here is our forecast.',
  'Date: this line is body text, not a header.',
].join('\r\n');

const NOW = new Date('2026-10-26T06:00:00Z');

describe('makeSeedCopy', () => {
  test('replaces Date and Message-ID and adds the seed header', ({ expect }) => {
    const copy = makeSeedCopy(POOL_MESSAGE, { poolId: '18f0abc', now: NOW, nonce: '20261026-007' });
    expect(readHeader(copy, 'Date')).toBe('Mon, 26 Oct 2026 06:00:00 +0000');
    expect(readHeader(copy, 'Message-ID')).toBe('<18f0abc.20261026-007@canary.dxos.org>');
    expect(readHeader(copy, SEED_HEADER)).toBe('18f0abc');
  });

  test('drops Bcc and keeps every other header, folded lines included', ({ expect }) => {
    const copy = makeSeedCopy(POOL_MESSAGE, { poolId: '18f0abc', now: NOW, nonce: 'n' });
    expect(readHeader(copy, 'Bcc')).toBeUndefined();
    expect(readHeader(copy, 'Subject')).toBe('Re: forecast for the west desk');
    expect(readHeader(copy, 'From')).toBe('phillip.allen@enron.com');
    expect(copy.match(/^Date:/gm)).toHaveLength(2);
  });

  test('leaves the body byte for byte', ({ expect }) => {
    const copy = makeSeedCopy(POOL_MESSAGE, { poolId: 'id', now: NOW, nonce: 'n' });
    expect(copy.endsWith('\r\n\r\nHere is our forecast.\r\nDate: this line is body text, not a header.')).toBe(true);
  });

  test('keeps LF line endings when the message uses them', ({ expect }) => {
    const copy = makeSeedCopy(POOL_MESSAGE.replaceAll('\r\n', '\n'), { poolId: 'id', now: NOW, nonce: 'n' });
    expect(copy.includes('\r')).toBe(false);
    expect(readHeader(copy, 'Subject')).toBe('Re: forecast for the west desk');
  });

  test('round-trips 8-bit bodies through base64url', ({ expect }) => {
    const message = 'Subject: caf\xe9\r\n\r\nna\xefve body \xff';
    expect(decodeRaw(encodeRaw(message))).toBe(message);
  });
});
