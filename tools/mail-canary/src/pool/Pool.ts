//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { type GmailClient, GmailError } from '../gmail/index.ts';
import { splitMbox } from './mbox.ts';

/** Label of the Enron messages imported once by steps 01–02. */
export const POOL_LABEL = 'enron-pool';

/** The sync's default look-back; the pool must stay older than this or the canary space would sync it. */
export const SYNC_WINDOW_DAYS = 30;

// Gmail's simple upload takes 5 MB, and base64url grows a message by a third.
const MAX_MESSAGE_BYTES = 3_500_000;
const BATCH = 50;

export type ImportOptions = {
  readonly mboxPath: string;
  /** Holds how many messages are already imported, so a rerun resumes rather than duplicating. */
  readonly progressPath?: string;
  readonly concurrency?: number;
  readonly onProgress?: (imported: number, total: number) => void;
};

export type ImportResult = { readonly total: number; readonly imported: number; readonly skipped: number };

export type PoolStatus = {
  /** Messages under the pool label. */
  readonly size: number;
  readonly inInbox: number;
  readonly newerThanSyncWindow: number;
  /** Non-empty, archived, and older than the sync window. */
  readonly ready: boolean;
};

/** The Enron pool in the test account: imported once, then only read by the seeder. */
export class Pool {
  readonly #gmail: Pick<GmailClient, 'count' | 'ensureLabel' | 'importMessage'>;

  constructor(gmail: Pick<GmailClient, 'count' | 'ensureLabel' | 'importMessage'>) {
    this.#gmail = gmail;
  }

  /**
   * Imports every message of the mbox from step 01 under the pool label, archived, with its internal
   * date taken from the shifted `Date` header.
   */
  import({
    mboxPath,
    progressPath = `${mboxPath}.imported`,
    concurrency = 5,
    onProgress,
  }: ImportOptions): Effect.Effect<ImportResult, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const messages = yield* Effect.try({
        try: () => splitMbox(readFileSync(mboxPath, 'latin1')),
        catch: (cause) => new GmailError({ message: `cannot read ${mboxPath}: ${String(cause)}` }),
      });
      const start = existsSync(progressPath) ? Number(readFileSync(progressPath, 'utf8').trim()) || 0 : 0;
      const labelId = yield* this.#gmail.ensureLabel(POOL_LABEL);

      let skipped = 0;
      for (let offset = start; offset < messages.length; offset += BATCH) {
        const batch = messages.slice(offset, offset + BATCH);
        yield* Effect.forEach(
          batch,
          (message) => {
            if (Buffer.byteLength(message, 'latin1') > MAX_MESSAGE_BYTES) {
              skipped++;
              return Effect.void;
            }
            return this.#gmail.importMessage(message, [labelId]).pipe(Effect.asVoid);
          },
          { concurrency, discard: true },
        );
        const done = offset + batch.length;
        writeFileSync(progressPath, String(done));
        onProgress?.(done, messages.length);
      }
      return { total: messages.length, imported: messages.length - start - skipped, skipped };
    });
  }

  status(): Effect.Effect<PoolStatus, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const size = yield* this.#gmail.count(`label:${POOL_LABEL}`);
      const inInbox = yield* this.#gmail.count(`label:${POOL_LABEL} in:inbox`);
      const newerThanSyncWindow = yield* this.#gmail.count(`label:${POOL_LABEL} newer_than:${SYNC_WINDOW_DAYS + 1}d`);
      return { size, inInbox, newerThanSyncWindow, ready: size > 0 && inInbox === 0 && newerThanSyncWindow === 0 };
    });
  }
}
