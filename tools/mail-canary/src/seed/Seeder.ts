//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type SeededMessage } from '../checks/index.ts';
import { type GmailClient, type GmailError } from '../gmail/index.ts';
import { POOL_LABEL } from '../pool/index.ts';
import { SEED_HEADER, makeSeedCopy } from './copy.ts';

/** Label the canary puts on every copy, so it can find its own copies in Gmail. Sync ignores it. */
export const SEED_LABEL = 'dx-seed';

const DAY = 24 * 60 * 60 * 1000;

// Gmail allows 250 quota units per user per second; an insert costs 25.
const WRITE_CONCURRENCY = 4;

export type SeedResult = {
  readonly poolSize: number;
  /** Gmail ids of the copies, in the order they were seeded. */
  readonly seededIds: readonly string[];
};

/** Copies pool messages into the inbox as fresh mail for the sync to pick up, and cleans up old copies. */
export class Seeder {
  readonly #gmail: GmailClient;

  constructor(gmail: GmailClient) {
    this.#gmail = gmail;
  }

  /** Copies `count` pool messages into the inbox as fresh `dx-seed` mail. */
  seed({ count, now }: { count: number; now: Date }): Effect.Effect<SeedResult, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const poolIds = yield* this.#gmail.listIds(`label:${POOL_LABEL}`);
      const seedLabel = yield* this.#gmail.ensureLabel(SEED_LABEL);
      const nonce = now.toISOString().replace(/[^0-9]/g, '');
      const seededIds = yield* Effect.forEach(
        pickPoolSlice(poolIds, count, now),
        (poolId) =>
          this.#gmail.getMessage(poolId).pipe(
            Effect.map((message) => makeSeedCopy(message, { poolId, now, nonce })),
            Effect.flatMap((copy) => this.#gmail.insert(copy, ['INBOX', seedLabel])),
          ),
        { concurrency: WRITE_CONCURRENCY },
      );
      return { poolSize: poolIds.length, seededIds };
    });
  }

  /** Moves copies older than `days` to Trash, so the inbox stays small and deletes are exercised too. */
  trash(days = 2): Effect.Effect<number, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const ids = yield* this.#gmail.listIds(`label:${SEED_LABEL} older_than:${days}d`);
      yield* Effect.forEach(ids, (id) => this.#gmail.trash(id), { concurrency: WRITE_CONCURRENCY, discard: true });
      return ids.length;
    });
  }

  /** The copies seeded in the last `days`, with what the content check compares. */
  listSeeded(days = 2): Effect.Effect<SeededMessage[], GmailError> {
    return Effect.gen({ self: this }, function* () {
      const ids = yield* this.#gmail.listIds(`label:${SEED_LABEL} newer_than:${days}d`);
      return yield* Effect.forEach(
        ids,
        (id) =>
          this.#gmail.getMetadata(id, ['Subject', 'From', SEED_HEADER]).pipe(
            Effect.map((message): SeededMessage => ({
              gmailId: message.id,
              insertedAt: message.internalDate,
              subject: message.headers.Subject,
              sender: parseAddress(message.headers.From),
            })),
          ),
        { concurrency: 8 },
      );
    });
  }
}

/**
 * Picks the pool messages for one night: a contiguous slice of the pool's ids, advanced by `count`
 * each day, so consecutive nights copy different mail and the run needs no stored cursor.
 */
export const pickPoolSlice = (poolIds: readonly string[], count: number, now: Date): string[] => {
  if (poolIds.length === 0) {
    return [];
  }
  const sorted = [...poolIds].sort();
  const offset = (Math.floor(now.getTime() / DAY) * count) % sorted.length;
  return Array.from({ length: Math.min(count, sorted.length) }, (_, index) => sorted[(offset + index) % sorted.length]);
};

/** The bare address of a `From` header (`Name <a@b>`, `<a@b>` or `a@b`). */
export const parseAddress = (value?: string): string | undefined =>
  value?.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/)?.[1] ?? value?.match(/[^\s<>"]+@[^\s<>"]+/)?.[0];
