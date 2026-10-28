//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { readHeader } from '../gmail/index.ts';
import { SEED_HEADER, Seeder, type SeederGmail, makeSeedCopy } from './Seeder.ts';

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

describe('Seeder.rotate', () => {
  test('replaces the oldest pool messages with copies under the pool label only', async ({ expect }) => {
    const calls: string[] = [];
    const gmail: SeederGmail = {
      ensureLabel: (name) => Effect.succeed(`label:${name}`),
      // Gmail lists newest first.
      listIds: () => Effect.succeed(['newest', 'middle', 'oldest-1', 'oldest-0']),
      getMessage: (id) => Effect.succeed(POOL_MESSAGE.replace('12345', id)),
      insert: (message, labelIds) => {
        const copyId = `copy-of-${readHeader(message, SEED_HEADER)}`;
        calls.push(`insert ${copyId} ${labelIds.join(',')}`);
        return Effect.succeed(copyId);
      },
      trash: (id) => Effect.sync(() => void calls.push(`trash ${id}`)),
      getMetadata: (id) =>
        Effect.succeed({
          id,
          internalDate: NOW.getTime(),
          headers: { Subject: 'Re: forecast', From: 'Phillip Allen <phillip.allen@enron.com>' },
        }),
    };

    const result = await EffectEx.runPromise(new Seeder(gmail).rotate({ count: 2, now: NOW }));

    expect(result.poolSize).toBe(4);
    expect(result.trashed).toBe(2);
    expect(result.seeded.map((message) => message.gmailId)).toEqual(['copy-of-oldest-1', 'copy-of-oldest-0']);
    expect(result.seeded[0].sender).toBe('phillip.allen@enron.com');
    for (const poolId of ['oldest-1', 'oldest-0']) {
      // The copy lands before its original goes, so a failed night never shrinks the pool.
      expect(calls.indexOf(`insert copy-of-${poolId} INBOX,label:enron-pool`)).toBeLessThan(
        calls.indexOf(`trash ${poolId}`),
      );
    }
    expect(calls.filter((call) => call.startsWith('trash'))).toHaveLength(2);
  });

  test('refuses a count that is not a positive integer before touching Gmail', async ({ expect }) => {
    const calls: string[] = [];
    const record = (call: string) => Effect.sync(() => void calls.push(call));
    const gmail: SeederGmail = {
      ensureLabel: (name) => record(`ensureLabel ${name}`).pipe(Effect.as(name)),
      listIds: () => record('listIds').pipe(Effect.as(['oldest'])),
      getMessage: () => record('getMessage').pipe(Effect.as(POOL_MESSAGE)),
      insert: () => record('insert').pipe(Effect.as('copy')),
      trash: () => record('trash'),
      getMetadata: (id) => record('getMetadata').pipe(Effect.as({ id, internalDate: 0, headers: {} })),
    };

    for (const count of [0, Number.NaN, 1.5]) {
      const exit = await EffectEx.runPromise(new Seeder(gmail).rotate({ count, now: NOW }).pipe(Effect.exit));
      expect(Exit.isFailure(exit)).toBe(true);
    }
    expect(calls).toEqual([]);
  });
});
