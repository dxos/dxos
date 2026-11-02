//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import * as SqlService from '@dxos/compute/SqlService';
import { Database, Feed } from '@dxos/echo';
import { log } from '@dxos/log';
import { Reducer, type Trajectory } from '@dxos/trajectory';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/trajectory-cache/index.ts';
import * as Legacy from './Legacy.ts';
import { lastItem, readItems } from './trajectory-items.ts';

/** Namespace owning the cache's tables. */
const DATABASE = 'trajectory-cache';

/** Where a checkpoint stands in a feed's local order: the item it last folded and how many it folded. */
type Position = {
  readonly cursor: string;
  readonly head: string;
  readonly count: number;
};

/**
 * A checkpoint this process already holds, so a load folds only the items after it instead of reading and decoding
 * the stored one; `saved` is the count the stored checkpoint was taken at.
 */
type Memo<S> = Reducer.Checkpoint<S> & Position & { readonly reducer: string; readonly saved: number };

/** Checkpoints kept per database; the bound keeps a long session from holding every conversation it opened. */
const MEMO_LIMIT = 64;
const memos = new WeakMap<object, Map<string, Memo<unknown>>>();

/** A reducer's id names its state shape, so a memo stored under it holds that reducer's state. */
const isMemoOf = <S>(memo: Memo<unknown>, reducer: Reducer.Durable<S>): memo is Memo<S> => memo.reducer === reducer.id;

/**
 * Items folded between saves of a checkpoint: saving encodes the whole state, so saving every turn makes each turn
 * cost as much as the conversation is long. A process that starts again refolds at most this many items.
 */
const SAVE_EVERY = 64;

/** A checkpoint and the local cursor of the last item it folded, so a reader can follow the feed from there. */
export type Resumable<S> = {
  readonly checkpoint: Reducer.Checkpoint<S>;
  readonly cursor?: Feed.LocalCursor;
};

/**
 * Folds `feed` with `reducer`, resuming from the checkpoint this process holds or the one stored for it and saving the
 * new one, so a reader pays for the events since its last read rather than for the whole conversation. Without
 * `SqlService` only the process's own checkpoint is used; when no checkpoint can be trusted it refolds the feed.
 */
export const load = <S>(
  feed: Feed.Feed,
  reducer: Reducer.Durable<S>,
): Effect.Effect<Reducer.Checkpoint<S>, never, Database.Service> =>
  Effect.map(loadAt(feed, reducer), (resumable) => resumable.checkpoint);

/** {@link load}, with the cursor the checkpoint stops at: a reader that follows the feed walks on from there. */
export const loadAt = Effect.fnUntraced(function* <S>(
  feed: Feed.Feed,
  reducer: Reducer.Durable<S>,
): Effect.fn.Return<Resumable<S>, never, Database.Service> {
  const service = yield* Effect.serviceOption(SqlService.SqlService);
  if (Option.isNone(service)) {
    return yield* memoOnly(feed, reducer);
  }

  return yield* Effect.gen(function* () {
    yield* migrate();
    return yield* cached(feed, reducer, yield* SqlClient.SqlClient);
  }).pipe(
    Effect.provide(SqlService.database({ name: DATABASE })),
    Effect.provideService(SqlService.SqlService, service.value),
    // The cache only saves work; an unusable one must not take the conversation down with it.
    Effect.catchTag('SqlError', (error) =>
      Effect.gen(function* () {
        log.warn('trajectory cache unavailable', { error });
        return yield* memoOnly(feed, reducer);
      }),
    ),
  );
});

/** {@link cached} without a store: with no client it runs no SQL, so it has no SQL error to fail with. */
const memoOnly = <S>(
  feed: Feed.Feed,
  reducer: Reducer.Durable<S>,
): Effect.Effect<Resumable<S>, never, Database.Service> => cached(feed, reducer, undefined).pipe(Effect.orDie);

/** Folds `feed` onto this process's checkpoint, else the one stored in `sql` (when given), else from the start. */
const cached = Effect.fnUntraced(function* <S>(
  feed: Feed.Feed,
  reducer: Reducer.Durable<S>,
  sql: SqlClient.SqlClient | undefined,
): Effect.fn.Return<Resumable<S>, SqlError.SqlError, Database.Service> {
  const trajectory = trajectoryId(feed);
  const { db } = yield* Database.Service;
  const memo = memos.get(db) ?? new Map<string, Memo<unknown>>();
  memos.set(db, memo);
  const key = `${trajectory}|${reducer.id}`;

  const known = memo.get(key);
  const remembered = known && isMemoOf(known, reducer) ? known : undefined;
  const fromMemo = remembered && (yield* tailAfter(feed, remembered));
  const resumed = fromMemo
    ? { checkpoint: remembered, position: remembered, saved: remembered.saved, tail: fromMemo }
    : sql && (yield* resumeStored(feed, reducer, sql));
  const items = resumed?.tail ?? (yield* readItems(feed));
  const checkpoint = Reducer.run(reducer, Legacy.toEvents(items), resumed?.checkpoint);

  const last = items.at(-1);
  const lastCursor = last && Feed.getLocalCursor(last);
  const position = last && lastCursor !== undefined ? { cursor: lastCursor, head: last.id } : resumed?.position;
  let saved = resumed?.saved ?? 0;
  if (sql && position && (!resumed || checkpoint.count - saved >= SAVE_EVERY)) {
    const state = JSON.stringify(Schema.encodeSync(reducer.schema)(checkpoint.state));
    yield* sql`
        INSERT INTO trajectory_checkpoint (trajectory, reducer, cursor, head, count, state)
        VALUES (${trajectory}, ${reducer.id}, ${position.cursor}, ${position.head}, ${checkpoint.count}, ${state})
        ON CONFLICT (trajectory, reducer) DO UPDATE SET
          cursor = excluded.cursor, head = excluded.head, count = excluded.count, state = excluded.state
      `;
    saved = checkpoint.count;
  }

  memo.delete(key);
  if (position) {
    memo.set(key, { ...checkpoint, cursor: position.cursor, head: position.head, reducer: reducer.id, saved });
  }
  for (const oldest of memo.keys()) {
    if (memo.size <= MEMO_LIMIT) {
      break;
    }
    memo.delete(oldest);
  }

  const cursor = position && Schema.decodeUnknownOption(Feed.LocalCursor)(position.cursor);
  return { checkpoint, cursor: cursor && Option.isSome(cursor) ? cursor.value : undefined };
});

/**
 * The items after `position`, or `undefined` when a checkpoint taken there cannot be resumed: its cursor is not a walk's
 * local cursor (a checkpoint from before walks), the walk no longer reaches it, or the tail holds a legacy record
 * (whose conversion needs the whole feed).
 */
const tailAfter = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  position: Omit<Position, 'count'>,
): Effect.fn.Return<(Trajectory.Event | Legacy.Record)[] | undefined, never, Database.Service> {
  const cursor = Schema.decodeUnknownOption(Feed.LocalCursor)(position.cursor);
  if (Option.isNone(cursor) || !position.cursor.includes('|')) {
    return undefined;
  }

  const tail = yield* readItems(feed, { after: cursor.value });
  // A walk gives nothing after a cursor it cannot place, as it does when nothing is new; only in the second case is
  // the checkpoint's head still the walk's last item.
  if (tail.length === 0 && (yield* lastItem(feed))?.id !== position.head) {
    return undefined;
  }
  return tail.some(Legacy.isRecord) ? undefined : tail;
});

/** The stored checkpoint and the items after it, or `undefined` when there is none, it cannot resume or it no longer decodes. */
const resumeStored = Effect.fnUntraced(function* <S>(
  feed: Feed.Feed,
  reducer: Reducer.Durable<S>,
  sql: SqlClient.SqlClient,
): Effect.fn.Return<
  | {
      checkpoint: Reducer.Checkpoint<S>;
      position: Omit<Position, 'count'>;
      saved: number;
      tail: (Trajectory.Event | Legacy.Record)[];
    }
  | undefined,
  SqlError.SqlError,
  Database.Service
> {
  const [row] = yield* sql<Position & { readonly state: string }>`
      SELECT cursor, head, count, state FROM trajectory_checkpoint
      WHERE trajectory = ${trajectoryId(feed)} AND reducer = ${reducer.id}
    `;
  const tail = row && (yield* tailAfter(feed, row));
  if (!row || !tail) {
    return undefined;
  }

  const decoded = Schema.decodeUnknownOption(reducer.schema)(parseJson(row.state));
  if (Option.isNone(decoded)) {
    return undefined;
  }

  const { db } = yield* Database.Service;
  const state = reducer.rebind ? reducer.rebind(decoded.value, (ref) => db.makeRef(ref.uri)) : decoded.value;
  return { checkpoint: { state, head: row.head, count: row.count }, position: row, saved: row.count, tail };
});

/** Drops the checkpoints this process holds for `db`, as a restart would; the stored ones stay. */
export const forget = (db: object): void => {
  memos.delete(db);
};

/** The id a trajectory's checkpoints are stored under; the feed that holds it is a storage detail. */
export const trajectoryId = (feed: Feed.Feed): string => Feed.getFeedUri(feed) ?? feed.id;

const migrate = (): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
    // A malformed bundled manifest is a defect, not something a caller can recover from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
  );

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};
