//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { splitMbox } from '../../testing/mbox.ts';
import { CanaryError } from '../errors.ts';
import { type CanaryMailbox, type CanaryMailboxError } from '../gmail/index.ts';

/** The only label the canary puts on the test account's mail. */
export const POOL_LABEL = 'enron-pool';

/** The sync's default look-back; the pool is dated inside it so the canary space syncs all of it. */
const SYNC_WINDOW_DAYS = 30;

// Gmail's simple upload takes 5 MB, and base64url grows a message by a third.
const MAX_MESSAGE_BYTES = 3_500_000;
const BATCH = 50;
// Gmail allows 250 quota units per user per second; an import costs 25.
const CONCURRENCY = 5;

export type ImportOptions = {
  readonly mboxPath: string;
  readonly concurrency?: number;
  readonly onProgress?: (imported: number, total: number) => void;
};

export type ImportResult = { readonly total: number; readonly imported: number; readonly skipped: number };

export type PoolStatus = {
  /** Messages under the pool label. */
  readonly size: number;
  /** What the mbox should have put there, when one is given. */
  readonly expected?: number;
  readonly inInbox: number;
  readonly olderThanSyncWindow: number;
  /** Non-empty, all in the inbox, all inside the sync window, and exactly the mbox when one is given. */
  readonly ready: boolean;
};

type PoolGmail = Pick<CanaryMailbox, 'count' | 'deleteLabels' | 'ensureLabel' | 'importMessage' | 'listIds' | 'trash'>;

/** The Enron pool in the test account: inbox mail the canary space syncs. */
export class Pool {
  readonly #gmail: PoolGmail;

  constructor(gmail: PoolGmail) {
    this.#gmail = gmail;
  }

  /**
   * Imports every message of the mbox from step 01 into the inbox under the pool label alone, with its
   * internal date taken from the shifted `Date` header.
   */
  import({
    mboxPath,
    concurrency = CONCURRENCY,
    onProgress,
  }: ImportOptions): Effect.Effect<ImportResult, CanaryMailboxError> {
    return Effect.gen({ self: this }, function* () {
      const messages = yield* readMbox(mboxPath);
      // Counts the messages already imported, so a rerun resumes rather than duplicating.
      const progressPath = `${mboxPath}.imported`;
      const start = existsSync(progressPath) ? Number(readFileSync(progressPath, 'utf8').trim()) || 0 : 0;
      const labels = ['INBOX', yield* this.#gmail.ensureLabel(POOL_LABEL)];

      let skipped = 0;
      for (let offset = start; offset < messages.length; offset += BATCH) {
        const batch = messages.slice(offset, offset + BATCH);
        yield* Effect.forEach(
          batch,
          (message) => {
            if (!isImportable(message)) {
              skipped++;
              return Effect.void;
            }
            return this.#gmail.importMessage(message, labels).pipe(Effect.asVoid);
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

  /** Counts the pool and checks it is ready for step 03; with `mboxPath`, also that it holds exactly that mbox. */
  status({ mboxPath }: { mboxPath?: string } = {}): Effect.Effect<PoolStatus, CanaryMailboxError> {
    return Effect.gen({ self: this }, function* () {
      const expected = mboxPath ? (yield* readMbox(mboxPath)).filter(isImportable).length : undefined;
      const size = yield* this.#gmail.count(`label:${POOL_LABEL}`);
      const inInbox = yield* this.#gmail.count(`label:${POOL_LABEL} in:inbox`);
      const olderThanSyncWindow = yield* this.#gmail.count(`label:${POOL_LABEL} older_than:${SYNC_WINDOW_DAYS}d`);
      const ready =
        size > 0 && inInbox === size && olderThanSyncWindow === 0 && (expected === undefined || size === expected);
      return { size, expected, inInbox, olderThanSyncWindow, ready };
    });
  }

  /**
   * Moves every pool message to Trash, which Gmail empties after 30 days; the grant's `gmail.modify`
   * scope cannot delete outright. For clearing a trial import before the full one; it also deletes any
   * leftover per-folder `Enron/...` labels, which the pool no longer uses.
   */
  purge(): Effect.Effect<number, CanaryMailboxError> {
    return Effect.gen({ self: this }, function* () {
      const ids = yield* this.#gmail.listIds(`label:${POOL_LABEL}`);
      yield* Effect.forEach(ids, (id) => this.#gmail.trash(id), { concurrency: CONCURRENCY, discard: true });
      yield* this.#gmail.deleteLabels('Enron/');
      return ids.length;
    });
  }
}

const readMbox = (mboxPath: string): Effect.Effect<string[], CanaryError> =>
  Effect.try({
    try: () => splitMbox(readFileSync(mboxPath, 'latin1')),
    catch: (cause) => new CanaryError({ message: `cannot read ${mboxPath}: ${String(cause)}` }),
  });

const isImportable = (message: string): boolean => Buffer.byteLength(message, 'latin1') <= MAX_MESSAGE_BYTES;
