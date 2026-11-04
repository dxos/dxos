//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { Nightly, type NightlyMailbox, makeSeedCopy, parsePool } from '../nightly.ts';

const NOW = new Date('2026-10-26T06:00:00Z');

const POOL_MESSAGE = [
  'Message-ID: <12345.JavaMail.evans@thyme>',
  'Date: Mon, 14 May 2001 16:39:00 -0700 (PDT)',
  'From: Phillip Allen <phillip.allen@enron.com>',
  'Bcc: hidden@enron.com',
  'Subject: Re: forecast for',
  '\tthe west desk',
  '',
  'Here is our forecast.',
  'Date: this line is body text, not a header.',
].join('\r\n');

/** A mailbox whose newest earlier copy names `next` as the cursor (none when unset), recording each insert. */
const fakeMailbox = ({ next }: { next?: string } = {}) => {
  const inserted: string[] = [];
  const mailbox: NightlyMailbox = {
    ensureLabel: (name) => Effect.succeed(`label-${name}`),
    listIds: () => Effect.succeed(next === undefined ? [] : ['earlier-copy']),
    insert: (message, labels) =>
      Effect.sync(() => {
        const header = (name: string) => message.match(new RegExp(`^${name}: (.*)$`, 'm'))?.[1];
        inserted.push(`${header('X-Dx-Seed')}>${header('X-Dx-Seed-Next')} ${labels}`);
        return `copy-${inserted.length}`;
      }),
    getHeaders: (id, names) =>
      Effect.succeed({
        internalDate: 0,
        headers:
          id === 'earlier-copy'
            ? Object.fromEntries(names.map((name) => [name, next ?? '']))
            : { Subject: 'Re: forecast', From: 'Phillip Allen <phillip.allen@enron.com>' },
      }),
  };
  return { mailbox, inserted };
};

const POOL = Array.from({ length: 5 }, () => POOL_MESSAGE);

const emptySpace = {
  spaceId: 'space',
  snapshot: () => Effect.succeed({ invocations: [], messages: [], triggers: [] }),
  runSync: () => Effect.void,
};

describe('makeSeedCopy', () => {
  test('replaces Date and Message-ID, drops Bcc, adds the seed headers and leaves the body alone', ({ expect }) => {
    const copy = makeSeedCopy(POOL_MESSAGE, { index: 1, next: 3, now: NOW });
    expect(copy.match(/^Date: .*$/m)?.[0]).toBe('Date: Mon, 26 Oct 2026 06:00:00 +0000');
    expect(copy).toContain(`\r\nMessage-ID: <seed-1.${NOW.getTime()}@canary.dxos.org>\r\n`);
    expect(copy).toContain('X-Dx-Seed: 1\r\nX-Dx-Seed-Next: 3\r\n');
    expect(copy).not.toContain('Bcc');
    expect(copy).toContain('Subject: Re: forecast for\r\n\tthe west desk');
    expect(copy.endsWith('\r\n\r\nHere is our forecast.\r\nDate: this line is body text, not a header.')).toBe(true);
  });
});

describe('Nightly', () => {
  test('the first run seeds from the start of the pool', async ({ expect }) => {
    const { mailbox, inserted } = fakeMailbox();
    const { start, seeded } = await EffectEx.runPromise(new Nightly(mailbox, emptySpace).seed(POOL, 2, NOW));
    expect(start).toBe(0);
    expect(inserted.sort()).toEqual(['0>2 INBOX,label-enron-seed', '1>2 INBOX,label-enron-seed']);
    expect(seeded).toEqual([
      expect.objectContaining({ subject: 'Re: forecast', sender: 'phillip.allen@enron.com' }),
      expect.objectContaining({ subject: 'Re: forecast' }),
    ]);
  });

  test('a later run continues from the cursor and wraps at the end of the pool', async ({ expect }) => {
    const { mailbox, inserted } = fakeMailbox({ next: '4' });
    const { start } = await EffectEx.runPromise(new Nightly(mailbox, emptySpace).seed(POOL, 3, NOW));
    expect(start).toBe(4);
    expect(inserted.map((call) => call.split(' ')[0]).sort()).toEqual(['0>2', '1>2', '4>2']);
  });

  test('a cursor the pool cannot hold restarts at 0', async ({ expect }) => {
    for (const next of ['9', 'junk', '-1']) {
      const { start } = await EffectEx.runPromise(
        new Nightly(fakeMailbox({ next }).mailbox, emptySpace).seed(POOL, 1, NOW),
      );
      expect(start).toBe(0);
    }
  });

  test('refuses a bad count or a short pool before writing anything', async ({ expect }) => {
    for (const count of [0, Number.NaN, 6]) {
      const { mailbox, inserted } = fakeMailbox();
      const exit = await EffectEx.runPromise(new Nightly(mailbox, emptySpace).seed(POOL, count, NOW).pipe(Effect.exit));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(inserted).toEqual([]);
    }
  });

  test('reports a copy still missing when the wait ends, however recently it was seeded', async ({ expect }) => {
    const report = await EffectEx.runPromise(
      new Nightly(fakeMailbox().mailbox, emptySpace).run({
        seed: { pool: POOL, count: 1 },
        syncTimeout: Duration.millis(50),
        pollInterval: Duration.millis(10),
        window: Duration.hours(24),
      }),
    );
    expect(report.checks.find((check) => check.id === 'S1')?.failures).toEqual([
      expect.objectContaining({ class: 'OFF', message: 'Gmail message not synced' }),
    ]);
    expect(report.seed?.syncSeconds).toBeUndefined();
  });

  test('without seeding it checks only the sync runs', async ({ expect }) => {
    const report = await EffectEx.runPromise(
      new Nightly(fakeMailbox().mailbox, emptySpace).run({
        syncTimeout: Duration.millis(50),
        pollInterval: Duration.millis(10),
        window: Duration.hours(24),
      }),
    );
    expect(report.checks.map((check) => check.id)).toEqual(['S2']);
    expect(report.seed).toBeUndefined();
  });
});

describe('parsePool', () => {
  test('splits an mbox and drops a message too large to insert', ({ expect }) => {
    const mbox = [
      'From a@enron.com Mon May 14 16:39:00 2001',
      'Subject: one',
      '',
      'body',
      'From b@enron.com Mon May 14 16:40:00 2001',
      'Subject: two',
      '',
      'x'.repeat(3_600_000),
      '',
    ].join('\n');
    expect(parsePool(mbox).map((message) => message.match(/^Subject: (.*)$/m)?.[1])).toEqual(['one']);
  });
});
