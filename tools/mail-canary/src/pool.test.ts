//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { GmailError } from './gmail.ts';
import { importPool } from './pool.ts';
import { decodeRaw } from './seed-copy.ts';

const mbox = (count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      `From MAILER-DAEMON Mon Oct 26 15:54:47 2026\nMessage-ID: <${index}@thyme>\nSubject: ${index}\n\nbody\n`,
  ).join('\n');

const fakeGmail = ({ failAt }: { failAt?: number } = {}) => {
  const imported: string[] = [];
  return {
    imported,
    gmail: {
      ensureLabel: (name: string) => Effect.succeed(`label-${name}`),
      importMessage: (raw: string, labelIds: readonly string[]) => {
        const subject = decodeRaw(raw).match(/^Subject: (.*)$/m)?.[1] ?? '';
        if (failAt !== undefined && Number(subject) === failAt) {
          return Effect.fail(new GmailError({ message: 'quota', status: 403 }));
        }
        imported.push(`${subject}:${labelIds.join(',')}`);
        return Effect.succeed(`id-${subject}`);
      },
    },
  };
};

describe('importPool', () => {
  test('imports every message archived under the pool label', async ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'pool-'));
    writeFileSync(join(dir, 'pool.mbox'), mbox(120));
    const { gmail, imported } = fakeGmail();
    const result = await EffectEx.runPromise(importPool(gmail, { mboxPath: join(dir, 'pool.mbox'), concurrency: 1 }));
    expect(result).toEqual({ total: 120, imported: 120, skipped: 0 });
    expect(imported[0]).toBe('0:label-enron-pool');
    expect(readFileSync(join(dir, 'pool.mbox.imported'), 'utf8')).toBe('120');
  });

  test('a rerun resumes after the last completed batch instead of importing twice', async ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'pool-'));
    const mboxPath = join(dir, 'pool.mbox');
    writeFileSync(mboxPath, mbox(120));
    const first = fakeGmail({ failAt: 75 });
    await expect(EffectEx.runPromise(importPool(first.gmail, { mboxPath, concurrency: 1 }))).rejects.toThrow('quota');
    expect(readFileSync(`${mboxPath}.imported`, 'utf8')).toBe('50');

    const second = fakeGmail();
    const result = await EffectEx.runPromise(importPool(second.gmail, { mboxPath, concurrency: 1 }));
    expect(result.imported).toBe(70);
    expect(second.imported[0]).toBe('50:label-enron-pool');
  });
});
