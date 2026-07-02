//
// Copyright 2026 DXOS.org
//

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { type ContentBlock, Message } from '@dxos/types';

import { type ParquetRow, parquetSource } from './parquet';

// The email dataset (https://huggingface.co/datasets/corbt/enron-emails) is exposed via ROOT_DIR;
// its layout is `${ROOT_DIR}/data/train-*.parquet`.
const ROOT_DIR = process.env.ROOT_DIR;

const asIso = (value: unknown): string => (value instanceof Date ? value : new Date(String(value))).toISOString();

// Map one email row (see the dataset's `dataset_info` schema) to a Message carrying the body as a
// text block. Test-only: keeps the generic @dxos/pipeline package free of an @dxos/types dependency.
const emailToMessage = (row: ParquetRow): Message.Message => {
  const block: ContentBlock.Text = { _tag: 'text', text: String(row.body ?? '') };
  return Message.make({
    created: asIso(row.date),
    sender: { email: String(row.from ?? '') },
    blocks: [block],
    properties: {
      messageId: row.message_id,
      subject: row.subject,
      to: row.to,
      cc: row.cc,
      bcc: row.bcc,
      fileName: row.file_name,
    },
  });
};

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

  // Runs only when ROOT_DIR points at the local dataset; skipped in CI so the suite stays green.
  describe.skipIf(!ROOT_DIR)('local dataset', () => {
    test('reads shards and converts the first rows to Messages', async ({ expect }) => {
      const dataDir = join(ROOT_DIR!, 'data');
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
