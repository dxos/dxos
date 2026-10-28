//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { Nightly, type NightlyMailbox, makeSeedCopy } from '../nightly.ts';

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

/** A pool of `size` messages, newest first as Gmail lists them, recording every write. */
const fakeMailbox = (size: number) => {
  const calls: string[] = [];
  const mailbox: NightlyMailbox = {
    ensureLabel: (name) => Effect.succeed(`label-${name}`),
    listIds: () => Effect.succeed(Array.from({ length: size }, (_, index) => `pool-${size - 1 - index}`)),
    getRaw: () => Effect.succeed(POOL_MESSAGE),
    insert: (message, labels) =>
      Effect.sync(() => calls.push(`insert ${message.match(/^X-Dx-Seed: (.*)$/m)?.[1]} ${labels}`)).pipe(
        Effect.as(`copy-${calls.length}`),
      ),
    trash: (id) => Effect.sync(() => void calls.push(`trash ${id}`)),
    getHeaders: () =>
      Effect.succeed({
        internalDate: 0,
        headers: { Subject: 'Re: forecast', From: 'Phillip Allen <phillip.allen@enron.com>' },
      }),
  };
  return { mailbox, calls };
};

const emptySpace = {
  spaceId: 'space',
  snapshot: () => Effect.succeed({ invocations: [], messages: [], triggers: [] }),
};

describe('makeSeedCopy', () => {
  test('replaces Date and Message-ID, drops Bcc, names the original and leaves the body alone', ({ expect }) => {
    const copy = makeSeedCopy(POOL_MESSAGE, 'pool-1', NOW);
    expect(copy.match(/^Date: .*$/m)?.[0]).toBe('Date: Mon, 26 Oct 2026 06:00:00 +0000');
    expect(copy).toContain(`\r\nMessage-ID: <pool-1.${NOW.getTime()}@canary.dxos.org>\r\n`);
    expect(copy).toContain('X-Dx-Seed: pool-1');
    expect(copy).not.toContain('Bcc');
    expect(copy).toContain('Subject: Re: forecast for\r\n\tthe west desk');
    expect(copy.endsWith('\r\n\r\nHere is our forecast.\r\nDate: this line is body text, not a header.')).toBe(true);
  });
});

describe('Nightly', () => {
  test('rotates the oldest pool messages, inserting each copy before trashing its original', async ({ expect }) => {
    const { mailbox, calls } = fakeMailbox(4);
    const { seeded } = await EffectEx.runPromise(new Nightly(mailbox, emptySpace).rotate(2, NOW));
    expect(seeded).toEqual([
      expect.objectContaining({ subject: 'Re: forecast', sender: 'phillip.allen@enron.com' }),
      expect.objectContaining({ subject: 'Re: forecast' }),
    ]);
    expect(calls.filter((call) => call.startsWith('trash')).sort()).toEqual(['trash pool-0', 'trash pool-1']);
    expect(calls.indexOf('insert pool-0 INBOX,label-enron-pool')).toBeLessThan(calls.indexOf('trash pool-0'));
  });

  test('refuses a bad count or a short pool before writing anything', async ({ expect }) => {
    for (const [size, count] of [
      [4, 0],
      [4, Number.NaN],
      [2, 3],
    ]) {
      const { mailbox, calls } = fakeMailbox(size);
      const exit = await EffectEx.runPromise(new Nightly(mailbox, emptySpace).rotate(count, NOW).pipe(Effect.exit));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(calls).toEqual([]);
    }
  });

  test('reports a copy still missing when the wait ends, however recently it was seeded', async ({ expect }) => {
    const report = await EffectEx.runPromise(
      new Nightly(fakeMailbox(1).mailbox, emptySpace).run({
        count: 1,
        syncTimeout: Duration.millis(50),
        pollInterval: Duration.millis(10),
        window: Duration.hours(25),
      }),
    );
    expect(report.checks.find((check) => check.id === 'C5')?.failures).toHaveLength(1);
    expect(report.syncMinutes).toBeUndefined();
  });
});
