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
import { type Durable, Reducer, type Trajectory } from '@dxos/trajectory';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/trajectory-cache/index.ts';
import * as Legacy from './Legacy.ts';
import { readItems } from './trajectory-items.ts';

/** Namespace owning the cache's tables. */
const DATABASE = 'trajectory-cache';

type Row = {
  readonly cursor: string;
  readonly head: string;
  readonly count: number;
  readonly state: string;
};

/**
 * Folds `feed` with `reducer`, resuming from the checkpoint stored for it and saving the new one, so a reader pays
 * for the events since its last read rather than for the whole conversation. Without `SqlService`, or when the stored
 * checkpoint cannot be trusted, it refolds the feed.
 */
export const load = Effect.fnUntraced(function* <S>(
  feed: Feed.Feed,
  reducer: Durable.Durable<S>,
): Effect.fn.Return<Reducer.Checkpoint<S>, never, Database.Service> {
  const service = yield* Effect.serviceOption(SqlService.SqlService);
  if (Option.isNone(service)) {
    return yield* refold(feed, reducer);
  }

  return yield* cached(feed, reducer).pipe(
    Effect.provide(SqlService.database({ name: DATABASE })),
    Effect.provideService(SqlService.SqlService, service.value),
    // The cache only saves work; an unusable one must not take the conversation down with it.
    Effect.catchTag('SqlError', (error) =>
      Effect.gen(function* () {
        log.warn('trajectory cache unavailable', { error });
        return yield* refold(feed, reducer);
      }),
    ),
  );
});

const refold = <S>(
  feed: Feed.Feed,
  reducer: Reducer.Reducer<S>,
): Effect.Effect<Reducer.Checkpoint<S>, never, Database.Service> =>
  Effect.map(readItems(feed), (items) => Reducer.run(reducer, Legacy.toEvents(items)));

const cached = Effect.fnUntraced(function* <S>(
  feed: Feed.Feed,
  reducer: Durable.Durable<S>,
): Effect.fn.Return<Reducer.Checkpoint<S>, SqlError.SqlError, Database.Service | SqlClient.SqlClient> {
  yield* migrate();
  const sql = yield* SqlClient.SqlClient;
  const key = Feed.getFeedUri(feed) ?? feed.id;
  const [row] = yield* sql<Row>`
      SELECT cursor, head, count, state FROM trajectory_checkpoint WHERE feed = ${key} AND reducer = ${reducer.id}
    `;

  const resumed = row ? yield* resume(feed, reducer, row) : undefined;
  const items = resumed?.tail ?? (yield* readItems(feed));
  const checkpoint = Reducer.run(reducer, Legacy.toEvents(items), resumed?.checkpoint);

  const last = items.at(-1);
  const cursor = last && Feed.getLocalCursor(last);
  if (last && cursor !== undefined) {
    const state = JSON.stringify(Schema.encodeSync(reducer.schema)(checkpoint.state));
    yield* sql`
        INSERT INTO trajectory_checkpoint (feed, reducer, cursor, head, count, state)
        VALUES (${key}, ${reducer.id}, ${cursor}, ${last.id}, ${checkpoint.count}, ${state})
        ON CONFLICT (feed, reducer) DO UPDATE SET
          cursor = excluded.cursor, head = excluded.head, count = excluded.count, state = excluded.state
      `;
  }

  return checkpoint;
});

/**
 * The stored checkpoint and the items after it, or `undefined` when it has to be rebuilt: the item at its cursor is
 * no longer the one it was taken at (a rebuilt index), the tail holds a legacy record (whose conversion needs the
 * whole feed), or the stored state no longer decodes.
 */
const resume = Effect.fnUntraced(function* <S>(
  feed: Feed.Feed,
  reducer: Durable.Durable<S>,
  row: Row,
): Effect.fn.Return<
  { checkpoint: Reducer.Checkpoint<S>; tail: (Trajectory.Event | Legacy.Record)[] } | undefined,
  never,
  Database.Service
> {
  const at = Number(row.cursor);
  if (!Number.isSafeInteger(at)) {
    return undefined;
  }

  const [head] = yield* readItems(feed, {
    after: Feed.Cursor.make(String(at - 1)),
    before: Feed.Cursor.make(String(at + 1)),
  });
  if (head?.id !== row.head) {
    return undefined;
  }

  const tail = yield* readItems(feed, { after: Feed.Cursor.make(row.cursor) });
  if (tail.some(Legacy.isRecord)) {
    return undefined;
  }

  const decoded = Schema.decodeUnknownOption(reducer.schema)(parseJson(row.state));
  if (Option.isNone(decoded)) {
    return undefined;
  }

  const { db } = yield* Database.Service;
  const state = reducer.rebind ? reducer.rebind(decoded.value, (ref) => db.makeRef(ref.uri)) : decoded.value;
  return { checkpoint: { state, head: row.head, count: row.count }, tail };
});

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
