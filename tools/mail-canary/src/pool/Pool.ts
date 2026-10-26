//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { type GmailClient, GmailError, readHeader, rewriteHeaders } from '../gmail/index.ts';
import { splitMbox } from './mbox.ts';

/** Label of the Enron messages imported once by steps 01–02. */
export const POOL_LABEL = 'enron-pool';

/** Header step 01 writes with the message's original folder (`Enron/<custodian>/<folder>`); GYB reads it too. */
export const FOLDER_HEADER = 'X-Gmail-Labels';

/** The sync's default look-back; the pool must stay older than this or the canary space would sync it. */
export const SYNC_WINDOW_DAYS = 30;

// Gmail's simple upload takes 5 MB, and base64url grows a message by a third.
const MAX_MESSAGE_BYTES = 3_500_000;
const BATCH = 50;
// Gmail allows 250 quota units per user per second; an import costs 25.
const CONCURRENCY = 5;

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
  /** What the mbox should have put there, when one is given. */
  readonly expected?: number;
  readonly inInbox: number;
  readonly newerThanSyncWindow: number;
  /** Non-empty, archived, older than the sync window, and exactly the mbox when one is given. */
  readonly ready: boolean;
};

type PoolGmail = Pick<GmailClient, 'count' | 'ensureLabel' | 'importMessage' | 'listIds' | 'trash'>;

/** The Enron pool in the test account: imported once, then only read by the seeder. */
export class Pool {
  readonly #gmail: PoolGmail;

  constructor(gmail: PoolGmail) {
    this.#gmail = gmail;
  }

  /**
   * Imports every message of the mbox from step 01, archived, under the pool label and its original
   * folder's label, with its internal date taken from the shifted `Date` header.
   */
  import({
    mboxPath,
    progressPath = `${mboxPath}.imported`,
    concurrency = CONCURRENCY,
    onProgress,
  }: ImportOptions): Effect.Effect<ImportResult, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const messages = yield* readMbox(mboxPath);
      const start = existsSync(progressPath) ? Number(readFileSync(progressPath, 'utf8').trim()) || 0 : 0;
      const labelIds = new Map([[POOL_LABEL, yield* this.#gmail.ensureLabel(POOL_LABEL)]]);

      let skipped = 0;
      for (let offset = start; offset < messages.length; offset += BATCH) {
        const batch = messages.slice(offset, offset + BATCH);
        // Created one at a time before the batch, so two imports never race to create the same label.
        for (const name of new Set(batch.flatMap(folderLabels))) {
          if (!labelIds.has(name)) {
            labelIds.set(name, yield* this.#gmail.ensureLabel(name));
          }
        }
        yield* Effect.forEach(
          batch,
          (message) => {
            if (!isImportable(message)) {
              skipped++;
              return Effect.void;
            }
            const labels = [POOL_LABEL, ...folderLabels(message)].flatMap((name) => labelIds.get(name) ?? []);
            return this.#gmail
              .importMessage(rewriteHeaders(message, { drop: [FOLDER_HEADER] }), labels)
              .pipe(Effect.asVoid);
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
  status({ mboxPath }: { mboxPath?: string } = {}): Effect.Effect<PoolStatus, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const expected = mboxPath ? (yield* readMbox(mboxPath)).filter(isImportable).length : undefined;
      const size = yield* this.#gmail.count(`label:${POOL_LABEL}`);
      const inInbox = yield* this.#gmail.count(`label:${POOL_LABEL} in:inbox`);
      const newerThanSyncWindow = yield* this.#gmail.count(`label:${POOL_LABEL} newer_than:${SYNC_WINDOW_DAYS + 1}d`);
      const ready =
        size > 0 && inInbox === 0 && newerThanSyncWindow === 0 && (expected === undefined || size === expected);
      return { size, expected, inInbox, newerThanSyncWindow, ready };
    });
  }

  /**
   * Moves every pool message to Trash, which Gmail empties after 30 days; the grant's `gmail.modify`
   * scope cannot delete outright. For clearing a trial import before the full one.
   */
  purge(): Effect.Effect<number, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const ids = yield* this.#gmail.listIds(`label:${POOL_LABEL}`);
      yield* Effect.forEach(ids, (id) => this.#gmail.trash(id), { concurrency: CONCURRENCY, discard: true });
      return ids.length;
    });
  }
}

const readMbox = (mboxPath: string): Effect.Effect<string[], GmailError> =>
  Effect.try({
    try: () => splitMbox(readFileSync(mboxPath, 'latin1')),
    catch: (cause) => new GmailError({ message: `cannot read ${mboxPath}: ${String(cause)}` }),
  });

const isImportable = (message: string): boolean => Buffer.byteLength(message, 'latin1') <= MAX_MESSAGE_BYTES;

const folderLabels = (message: string): string[] =>
  (readHeader(message, FOLDER_HEADER) ?? '')
    .split(',')
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
