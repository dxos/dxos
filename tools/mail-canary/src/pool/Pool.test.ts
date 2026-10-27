//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { GmailError } from '../gmail/index.ts';
import { Pool } from './Pool.ts';

const mbox = (count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      `From MAILER-DAEMON Mon Oct 26 15:54:47 2026\nMessage-ID: <${index}@thyme>\nSubject: ${index}\n\nbody\n`,
  ).join('\n');

const fakeGmail = ({ failAt }: { failAt?: number } = {}) => {
  const imported: string[] = [];
  const created: string[] = [];
  const trashed: string[] = [];
  const deletedLabels: string[] = [];
  return {
    imported,
    created,
    trashed,
    deletedLabels,
    gmail: {
      // The pool is in the inbox and inside the sync window, so only the older_than search misses it.
      count: (query: string) => Effect.succeed(query.includes('older_than') ? 0 : imported.length),
      listIds: () => Effect.succeed(imported.map((_, index) => `id-${index}`)),
      trash: (id: string) => Effect.sync(() => void trashed.push(id)),
      deleteLabels: (prefix: string) => Effect.sync(() => deletedLabels.push(prefix)),
      ensureLabel: (name: string) =>
        Effect.sync(() => {
          created.push(name);
          return `label-${name}`;
        }),
      importMessage: (message: string, labelIds: readonly string[]) => {
        const subject = message.match(/^Subject: (.*)$/m)?.[1] ?? '';
        if (failAt !== undefined && Number(subject) === failAt) {
          return Effect.fail(new GmailError({ message: 'quota', status: 403 }));
        }
        imported.push(`${subject}:${labelIds.join(',')}`);
        return Effect.succeed(`id-${subject}`);
      },
    },
  };
};

const writeMbox = (text: string): string => {
  const mboxPath = join(mkdtempSync(join(tmpdir(), 'pool-')), 'pool.mbox');
  writeFileSync(mboxPath, text);
  return mboxPath;
};

describe('Pool.import', () => {
  test('imports every message into the inbox under the pool label', async ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'pool-'));
    writeFileSync(join(dir, 'pool.mbox'), mbox(120));
    const { gmail, imported, created } = fakeGmail();
    const result = await EffectEx.runPromise(
      new Pool(gmail).import({ mboxPath: join(dir, 'pool.mbox'), concurrency: 1 }),
    );
    expect(result).toEqual({ total: 120, imported: 120, skipped: 0 });
    expect(imported[0]).toBe('0:INBOX,label-enron-pool');
    expect(created).toEqual(['enron-pool']);
    expect(readFileSync(join(dir, 'pool.mbox.imported'), 'utf8')).toBe('120');
  });

  test('a rerun resumes after the last completed batch instead of importing twice', async ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'pool-'));
    const mboxPath = join(dir, 'pool.mbox');
    writeFileSync(mboxPath, mbox(120));
    const first = fakeGmail({ failAt: 75 });
    await expect(EffectEx.runPromise(new Pool(first.gmail).import({ mboxPath, concurrency: 1 }))).rejects.toThrow(
      'quota',
    );
    expect(readFileSync(`${mboxPath}.imported`, 'utf8')).toBe('50');

    const second = fakeGmail();
    const result = await EffectEx.runPromise(new Pool(second.gmail).import({ mboxPath, concurrency: 1 }));
    expect(result.imported).toBe(70);
    expect(second.imported[0]).toBe('50:INBOX,label-enron-pool');
  });
});

describe('Pool.status', () => {
  test('is ready only when the pool holds exactly the mbox', async ({ expect }) => {
    const mboxPath = writeMbox(mbox(3));
    const { gmail } = fakeGmail();
    const pool = new Pool(gmail);
    await EffectEx.runPromise(pool.import({ mboxPath }));
    expect(await EffectEx.runPromise(pool.status({ mboxPath }))).toMatchObject({ size: 3, expected: 3, ready: true });
    expect(await EffectEx.runPromise(pool.status({ mboxPath: writeMbox(mbox(4)) }))).toMatchObject({ ready: false });
  });

  test('purge trashes every pool message and deletes the Enron folder labels', async ({ expect }) => {
    const { gmail, trashed, deletedLabels } = fakeGmail();
    const pool = new Pool(gmail);
    await EffectEx.runPromise(pool.import({ mboxPath: writeMbox(mbox(3)) }));
    expect(await EffectEx.runPromise(pool.purge())).toBe(3);
    expect(trashed).toEqual(['id-0', 'id-1', 'id-2']);
    expect(deletedLabels).toEqual(['Enron/']);
  });
});
