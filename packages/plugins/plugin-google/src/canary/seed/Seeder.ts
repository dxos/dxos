//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as MailSync from '@dxos/plugin-inbox/MailSync';

import { type SeededMessage } from '../checks/index.ts';
import { CanaryError } from '../errors.ts';
import { type CanaryMailbox, type CanaryMailboxError, rewriteHeaders } from '../gmail/index.ts';
import { POOL_LABEL } from '../pool/index.ts';

/** Header that maps a seeded copy back to the pool message it was copied from. */
export const SEED_HEADER = 'X-Dx-Seed';

// Gmail allows 250 quota units per user per second; an insert costs 25.
const WRITE_CONCURRENCY = 4;

export type RotateResult = {
  readonly poolSize: number;
  /** The fresh copies, as Gmail reports them, in the order they were seeded. */
  readonly seeded: readonly SeededMessage[];
  /** Pool messages the copies replaced, now in Trash. */
  readonly trashed: number;
};

/**
 * Keeps the pool fresh for the sync: each night the oldest pool messages are replaced by copies dated
 * now, carrying the pool label and nothing else, so the inbox keeps its size and only `enron-pool`.
 */
/** The Gmail calls the rotation makes. */
export type SeederGmail = Pick<
  CanaryMailbox,
  'ensureLabel' | 'listIds' | 'getMessage' | 'insert' | 'trash' | 'getMetadata'
>;

export class Seeder {
  readonly #gmail: SeederGmail;

  constructor(gmail: SeederGmail) {
    this.#gmail = gmail;
  }

  /**
   * Copies the `count` oldest pool messages into the inbox as new mail, then trashes the originals,
   * so the sync sees both new mail and deletes. A copy is inserted before its original is trashed,
   * so a failed night never shrinks the pool.
   */
  rotate({ count, now }: { count: number; now: Date }): Effect.Effect<RotateResult, CanaryMailboxError> {
    return Effect.gen({ self: this }, function* () {
      // `slice(-count)` takes the whole pool for 0 or NaN, so a typo in the dispatch input would rotate all of it.
      if (!Number.isInteger(count) || count < 1) {
        return yield* new CanaryError({ message: `seed count must be a positive integer, got ${count}` });
      }
      const poolLabel = yield* this.#gmail.ensureLabel(POOL_LABEL);
      // Gmail lists newest first, so the oldest pool messages are at the end.
      const poolIds = yield* this.#gmail.listIds(`label:${POOL_LABEL}`);
      const nonce = now.toISOString().replace(/[^0-9]/g, '');
      const seeded = yield* Effect.forEach(
        poolIds.slice(-count),
        (poolId) =>
          Effect.gen({ self: this }, function* () {
            const copy = makeSeedCopy(yield* this.#gmail.getMessage(poolId), { poolId, now, nonce });
            const copyId = yield* this.#gmail.insert(copy, ['INBOX', poolLabel]);
            yield* this.#gmail.trash(poolId);
            const message = yield* this.#gmail.getMetadata(copyId, ['Subject', 'From']);
            return {
              gmailId: message.id,
              insertedAt: message.internalDate,
              subject: message.headers.Subject,
              sender: message.headers.From && MailSync.parseFromHeader(message.headers.From)?.email,
            } satisfies SeededMessage;
          }),
        { concurrency: WRITE_CONCURRENCY },
      );
      return { poolSize: poolIds.length, seeded, trashed: seeded.length };
    });
  }
}

/**
 * Rewrites a pool message into a fresh copy: a new `Date`, a new `Message-ID` and an `X-Dx-Seed`
 * header naming the pool message, with the body untouched. `Bcc` is dropped so a copy never names a
 * hidden recipient. The `Message-ID` must change because Gmail may drop an inserted message whose id it
 * has already seen, which would make the copy silently vanish.
 */
export const makeSeedCopy = (
  message: string,
  { poolId, now, nonce }: { poolId: string; now: Date; nonce: string },
): string =>
  rewriteHeaders(message, {
    drop: ['Date', 'Message-ID', SEED_HEADER, 'Bcc'],
    add: [
      `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
      `Message-ID: <${poolId}.${nonce}@canary.dxos.org>`,
      `${SEED_HEADER}: ${poolId}`,
    ],
  });
