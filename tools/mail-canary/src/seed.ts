//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type SeededMessage } from './checks.ts';
import { type Gmail, type GmailError } from './gmail.ts';
import { SEED_HEADER, decodeRaw, encodeRaw, makeSeedCopy } from './seed-copy.ts';

/** Label of the Enron messages imported once by steps 01–02. */
export const POOL_LABEL = 'enron-pool';

/** Label the canary puts on every copy, so it can find its own copies in Gmail. Sync ignores it. */
export const SEED_LABEL = 'dx-seed';

const DAY = 24 * 60 * 60 * 1000;

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

/** Copies `count` pool messages into the inbox as fresh `dx-seed` mail, returning the copies' Gmail ids. */
export const seedCopies = (
  gmail: Gmail,
  { count, now }: { count: number; now: Date },
): Effect.Effect<{ poolSize: number; seededIds: string[] }, GmailError> =>
  Effect.gen(function* () {
    const poolIds = yield* gmail.listIds(`label:${POOL_LABEL}`);
    const seedLabel = yield* gmail.ensureLabel(SEED_LABEL);
    const nonce = now.toISOString().replace(/[^0-9]/g, '');
    const seededIds = yield* Effect.forEach(
      pickPoolSlice(poolIds, count, now),
      (poolId) =>
        Effect.gen(function* () {
          const raw = decodeRaw(yield* gmail.getRaw(poolId));
          const copy = makeSeedCopy(raw, { poolId, now, nonce });
          return yield* gmail.insert(encodeRaw(copy), ['INBOX', seedLabel]);
        }),
      // Gmail allows 250 quota units per user per second; an insert costs 25.
      { concurrency: 4 },
    );
    return { poolSize: poolIds.length, seededIds };
  });

/** Moves copies older than `days` to Trash, so the inbox stays small and deletes are exercised too. */
export const trashOldCopies = (gmail: Gmail, days = 2): Effect.Effect<number, GmailError> =>
  Effect.gen(function* () {
    const ids = yield* gmail.listIds(`label:${SEED_LABEL} older_than:${days}d`);
    yield* Effect.forEach(ids, (id) => gmail.trash(id), { concurrency: 4, discard: true });
    return ids.length;
  });

/** The copies seeded in the last `days`, with what the content check compares. */
export const listSeeded = (gmail: Gmail, days = 2): Effect.Effect<SeededMessage[], GmailError> =>
  Effect.gen(function* () {
    const ids = yield* gmail.listIds(`label:${SEED_LABEL} newer_than:${days}d`);
    return yield* Effect.forEach(
      ids,
      (id) =>
        gmail.getMetadata(id, ['Subject', 'From', SEED_HEADER]).pipe(
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

/** The bare address of a `From` header (`Name <a@b>`, `<a@b>` or `a@b`). */
export const parseAddress = (value?: string): string | undefined =>
  value?.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/)?.[1] ?? value?.match(/[^\s<>"]+@[^\s<>"]+/)?.[0];
