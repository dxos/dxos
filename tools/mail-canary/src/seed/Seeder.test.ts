//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { readHeader } from '../gmail/index.ts';
import { SEED_HEADER, makeSeedCopy, pickPoolSlice } from './Seeder.ts';

const DAY = 24 * 60 * 60 * 1000;

describe('pickPoolSlice', () => {
  const pool = Array.from({ length: 250 }, (_, index) => `id-${String(index).padStart(3, '0')}`);

  test('consecutive days copy different mail', ({ expect }) => {
    const today = new Date(Date.UTC(2026, 9, 26, 6));
    const first = pickPoolSlice(pool, 100, today);
    const second = pickPoolSlice(pool, 100, new Date(today.getTime() + DAY));
    expect(first).toHaveLength(100);
    expect(first.filter((id) => second.includes(id))).toEqual([]);
  });

  test('wraps around the end of the pool and never repeats within a night', ({ expect }) => {
    const slice = pickPoolSlice(pool.slice(0, 30), 100, new Date(0));
    expect(slice).toHaveLength(30);
    expect(new Set(slice).size).toBe(30);
  });

  test('does not depend on the order Gmail lists the pool in', ({ expect }) => {
    const now = new Date(Date.UTC(2026, 0, 1));
    expect(pickPoolSlice([...pool].reverse(), 10, now)).toEqual(pickPoolSlice(pool, 10, now));
  });

  test('an empty pool gives nothing to seed', ({ expect }) => {
    expect(pickPoolSlice([], 100, new Date())).toEqual([]);
  });
});

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

  test('handles the CRLF headers Gmail prepends to a message imported with LF', ({ expect }) => {
    const pooled = [
      'Delivered-To: test@braneframe.com',
      'Received: from 901269299575',
      '\tby gmailapi.google.com;',
      '\tMon, 26 Oct 2026 20:41:10 +0000',
    ].join('\r\n');
    const original = 'Date: Sat, 23 May 2026 09:56:40 +0000\nFrom: jeff.dasovich@enron.com\nSubject: Re:\n\nok.\n';
    const copy = makeSeedCopy(`${pooled}\r\n${original}`, { poolId: 'id', now: NOW, nonce: 'n' });
    expect(readHeader(copy, 'From')).toBe('jeff.dasovich@enron.com');
    expect(readHeader(copy, 'Subject')).toBe('Re:');
    expect(readHeader(copy, 'Date')).toBe('Mon, 26 Oct 2026 06:00:00 +0000');
    expect(copy.endsWith('\n\nok.\n')).toBe(true);
  });

  test('keeps LF line endings when the message uses them', ({ expect }) => {
    const copy = makeSeedCopy(POOL_MESSAGE.replaceAll('\r\n', '\n'), { poolId: 'id', now: NOW, nonce: 'n' });
    expect(copy.includes('\r')).toBe(false);
    expect(readHeader(copy, 'Subject')).toBe('Re: forecast for the west desk');
  });
});
