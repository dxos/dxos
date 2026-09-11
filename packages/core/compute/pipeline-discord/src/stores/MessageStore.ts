//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { SqlTransaction } from '@dxos/sql-sqlite';

import { StoreError } from '../errors.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/message/index.ts';

/** A crawled message persisted outside ECHO — the pipeline's replayable working set. */
export type StoredMessage = {
  /** Source-native message id (snowflake); the primary key. */
  readonly id: string;
  /** Crawl target (channel or thread) the message belongs to. */
  readonly targetId: string;
  /** Source-native author id (stable key, not a display name). */
  readonly authorId: string;
  readonly authorLabel?: string;
  readonly text: string;
  /** ISO-8601 creation time. */
  readonly createdAt?: string;
  /** Id of the message this one replies to, when known. */
  readonly parentId?: string;
  /** Source-native message JSON (full fidelity for later re-processing). */
  readonly raw: string;
};

export interface Service {
  readonly has: (id: string) => Effect.Effect<boolean, StoreError>;
  /** Idempotent upsert keyed on id. */
  readonly put: (message: StoredMessage) => Effect.Effect<void, StoreError>;
  readonly get: (id: string) => Effect.Effect<StoredMessage | undefined, StoreError>;
  /** Messages of one target, ascending by id (chronological for snowflakes). */
  readonly listByTarget: (
    targetId: string,
    options?: { readonly limit?: number },
  ) => Effect.Effect<StoredMessage[], StoreError>;
  readonly count: () => Effect.Effect<number, StoreError>;
}

const fail = (message: string) => (cause: unknown) => new StoreError({ message, cause });

/**
 * Applies any migrations this database has not recorded yet.
 *
 * `SqlTransaction.clientLayer` is provided because the migrator wraps its work in the client's
 * `withTransaction`, which emits `BEGIN` / `COMMIT` — rejected in workerd.
 */
const migrate = (): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =>
  Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
    Effect.provide(SqlTransaction.clientLayer),
    // A malformed bundled manifest is a defect, not something a caller can recover from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('discord.messageStore.migrate'),
  );

type Row = {
  readonly id: string;
  readonly target_id: string;
  readonly author_id: string;
  readonly author_label: string | null;
  readonly text: string;
  readonly created_at: string | null;
  readonly parent_id: string | null;
  readonly raw: string;
};

const toMessage = (row: Row): StoredMessage => ({
  id: row.id,
  targetId: row.target_id,
  authorId: row.author_id,
  ...(row.author_label !== null ? { authorLabel: row.author_label } : {}),
  text: row.text,
  ...(row.created_at !== null ? { createdAt: row.created_at } : {}),
  ...(row.parent_id !== null ? { parentId: row.parent_id } : {}),
  raw: row.raw,
});

export class MessageStore extends Context.Service<MessageStore, Service>()('@dxos/pipeline-discord/MessageStore') {}

export const layerSql: Layer.Layer<MessageStore, never, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =
  Layer.effect(
    MessageStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // Schema creation is a fatal store-construction failure, not a recoverable per-op error.
      yield* migrate().pipe(Effect.orDie);
      return {
        has: (id) =>
          sql<{ found: number }>`SELECT COUNT(*) AS found FROM message WHERE id = ${id}`.pipe(
            Effect.map((rows) => Number(rows[0]?.found ?? 0) > 0),
            Effect.mapError(fail('Failed to read message')),
          ),
        put: (message) =>
          sql`INSERT INTO message (id, target_id, author_id, author_label, text, created_at, parent_id, raw)
          VALUES (${message.id}, ${message.targetId}, ${message.authorId}, ${message.authorLabel ?? null},
            ${message.text}, ${message.createdAt ?? null}, ${message.parentId ?? null}, ${message.raw})
          ON CONFLICT(id) DO UPDATE SET target_id = excluded.target_id, author_id = excluded.author_id,
            author_label = excluded.author_label, text = excluded.text, created_at = excluded.created_at,
            parent_id = excluded.parent_id, raw = excluded.raw`.pipe(
            Effect.asVoid,
            Effect.mapError(fail('Failed to persist message')),
          ),
        get: (id) =>
          sql<Row>`SELECT * FROM message WHERE id = ${id}`.pipe(
            Effect.map((rows) => (rows[0] ? toMessage(rows[0]) : undefined)),
            Effect.mapError(fail('Failed to read message')),
          ),
        listByTarget: (targetId, options) =>
          (options?.limit !== undefined
            ? sql<Row>`SELECT * FROM message WHERE target_id = ${targetId} ORDER BY id ASC LIMIT ${options.limit}`
            : sql<Row>`SELECT * FROM message WHERE target_id = ${targetId} ORDER BY id ASC`
          ).pipe(
            Effect.map((rows) => rows.map(toMessage)),
            Effect.mapError(fail('Failed to list messages')),
          ),
        count: () =>
          sql<{ found: number }>`SELECT COUNT(*) AS found FROM message`.pipe(
            Effect.map((rows) => Number(rows[0]?.found ?? 0)),
            Effect.mapError(fail('Failed to count messages')),
          ),
      };
    }),
  );

export const layerMemory: Layer.Layer<MessageStore> = Layer.sync(MessageStore, () => {
  const byId = new Map<string, StoredMessage>();
  return {
    has: (id) => Effect.sync(() => byId.has(id)),
    put: (message) => Effect.sync(() => void byId.set(message.id, message)),
    get: (id) => Effect.sync(() => byId.get(id)),
    listByTarget: (targetId, options) =>
      Effect.sync(() => {
        const listed = [...byId.values()]
          .filter((message) => message.targetId === targetId)
          .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
        return options?.limit !== undefined ? listed.slice(0, options.limit) : listed;
      }),
    count: () => Effect.sync(() => byId.size),
  };
});

export const has = (...args: Parameters<Service['has']>) => MessageStore.use((store) => store.has(...args));
export const put = (...args: Parameters<Service['put']>) => MessageStore.use((store) => store.put(...args));
export const get = (...args: Parameters<Service['get']>) => MessageStore.use((store) => store.get(...args));
export const listByTarget = (...args: Parameters<Service['listByTarget']>) =>
  MessageStore.use((store) => store.listByTarget(...args));
export const count = (...args: Parameters<Service['count']>) => MessageStore.use((store) => store.count(...args));
