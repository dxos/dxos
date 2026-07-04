//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';
import { captureSink } from '@dxos/pipeline/testing';
import { Message } from '@dxos/types';

import { emailToMessage } from './email-fixtures';
import { type ParquetRow, parquetSource } from './parquet';

// The email dataset (https://huggingface.co/datasets/corbt/enron-emails) is exposed via ROOT_DIR;
// its layout is `${ROOT_DIR}/data/train-*.parquet`.
const ROOT_DIR = process.env.ROOT_DIR;

type SenderCount = { readonly sender: string; readonly count: number };

describe('email parquet → Message', () => {
  test('maps an email row to a Message with a text body block', ({ expect }) => {
    const row: ParquetRow = {
      message_id: '<abc@example.com>',
      subject: 'Hello',
      from: 'alice@example.com',
      to: ['bob@example.com'],
      cc: [],
      bcc: [],
      date: new Date('2020-01-02T03:04:05.000Z'),
      body: 'Body text.',
      file_name: 'inbox/1.',
    };

    const message = emailToMessage(row);
    expect(message.sender.email).toBe('alice@example.com');
    expect(message.created).toBe('2020-01-02T03:04:05.000Z');
    expect(Message.extractText(message)).toBe('Body text.');
    expect(message.properties?.subject).toBe('Hello');
    expect(message.properties?.to).toEqual(['bob@example.com']);
    expect(message.properties?.messageId).toBe('<abc@example.com>');
  });

  test('a pipeline stage counts emails per sender', async ({ expect }) => {
    const rows: ParquetRow[] = [
      { from: 'alice@example.com', body: 'one' },
      { from: 'bob@example.com', body: 'two' },
      { from: 'alice@example.com', body: 'three' },
      { from: 'carol@example.com', body: 'four' },
    ];

    const { sink, items } = captureSink<SenderCount>();
    await EffectEx.runPromise(Stream.fromIterable(rows).pipe(countBySenderStage<never>(), Pipeline.run({ sink })));

    // The stage emits a running count per email; the final tally is the last count seen per sender.
    const totals = new Map(items.map(({ sender, count }) => [sender, count]));
    expect(totals.get('alice@example.com')).toBe(2);
    expect(totals.get('bob@example.com')).toBe(1);
    expect(totals.get('carol@example.com')).toBe(1);
  });

  // Runs only when ROOT_DIR points at the local dataset; skipped in CI so the suite stays green.
  describe.skipIf(!ROOT_DIR)('local dataset', () => {
    test('reads shards and converts the first rows to Messages', async ({ expect }) => {
      // Unreachable when unset (guarded by describe.skipIf); narrows to string without a cast.
      const rootDir = ROOT_DIR;
      if (!rootDir) {
        return;
      }

      const dataDir = join(rootDir, 'data');
      const files = (await readdir(dataDir))
        .filter((name) => /^train-.*\.parquet$/.test(name))
        .sort()
        .map((name) => join(dataDir, name));
      expect(files.length).toBeGreaterThan(0);

      const messages = await EffectEx.runPromise(
        parquetSource(files).pipe(
          Stream.take(5),
          Stream.map(emailToMessage),
          Stream.runCollect,
          Effect.map((chunk) => [...chunk]),
        ),
      );

      expect(messages).toHaveLength(5);
      for (const message of messages) {
        expect(typeof message.sender.email).toBe('string');
        expect(message.blocks.some((block) => block._tag === 'text')).toBe(true);
        expect(message.properties).toBeDefined();
      }
    });
  });
});

// A pipeline stage that maintains a running count of emails per sender, emitting the updated count
// for each email's sender as it flows through (a stateful scan; the counter map is bounded by the
// number of distinct senders, not the stream length).
const countBySenderStage =
  <E = never>(): Stage.Stage<ParquetRow, SenderCount, E> =>
  (input) =>
    input.pipe(
      Stream.mapAccum(new Map<string, number>(), (counts, row) => {
        const sender = String(row.from ?? '');
        const count = (counts.get(sender) ?? 0) + 1;
        counts.set(sender, count);
        return [counts, { sender, count }];
      }),
    );
