//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { type Gmail, GmailError } from './gmail.ts';
import { splitMbox } from './mbox.ts';
import { encodeRaw } from './seed-copy.ts';
import { POOL_LABEL } from './seed.ts';

// Gmail's metadata upload path takes a raw message of up to 5 MB; Enron mail is far smaller.
const MAX_RAW_BYTES = 4_500_000;
const BATCH = 50;

export type ImportPoolOptions = {
  readonly mboxPath: string;
  /** Holds how many messages are already imported, so a rerun resumes rather than duplicating. */
  readonly progressPath?: string;
  readonly concurrency?: number;
  readonly onProgress?: (imported: number, total: number) => void;
};

/**
 * Imports every message of the mbox from step 01 into Gmail under the pool label, archived (no
 * inbox), with its internal date taken from the shifted `Date` header.
 */
export const importPool = (
  gmail: Pick<Gmail, 'importMessage' | 'ensureLabel'>,
  { mboxPath, progressPath = `${mboxPath}.imported`, concurrency = 5, onProgress }: ImportPoolOptions,
): Effect.Effect<{ total: number; imported: number; skipped: number }, GmailError> =>
  Effect.gen(function* () {
    const messages = yield* Effect.try({
      try: () => splitMbox(readFileSync(mboxPath, 'latin1')),
      catch: (cause) => new GmailError({ message: `cannot read ${mboxPath}: ${String(cause)}` }),
    });
    const start = existsSync(progressPath) ? Number(readFileSync(progressPath, 'utf8').trim()) || 0 : 0;
    const labelId = yield* gmail.ensureLabel(POOL_LABEL);

    let skipped = 0;
    for (let offset = start; offset < messages.length; offset += BATCH) {
      const batch = messages.slice(offset, offset + BATCH);
      yield* Effect.forEach(
        batch,
        (message) => {
          const raw = encodeRaw(message);
          if (raw.length > MAX_RAW_BYTES) {
            skipped++;
            return Effect.void;
          }
          return gmail.importMessage(raw, [labelId]).pipe(Effect.asVoid);
        },
        { concurrency, discard: true },
      );
      const done = offset + batch.length;
      writeFileSync(progressPath, String(done));
      onProgress?.(done, messages.length);
    }
    return { total: messages.length, imported: messages.length - start - skipped, skipped };
  });
