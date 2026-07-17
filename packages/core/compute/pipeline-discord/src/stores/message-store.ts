//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { StoreError } from '../errors';

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

export interface MessageStoreApi {
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

const migrate = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    yield* sql`CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_label TEXT,
      text TEXT NOT NULL,
      created_at TEXT,
      parent_id TEXT,
      raw TEXT NOT NULL
    )`;
    yield* sql`CREATE INDEX IF NOT EXISTS message_target ON message (target_id, id)`;
  });

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

export class MessageStore extends Context.Tag('@dxos/pipeline-discord/MessageStore')<MessageStore, MessageStoreApi>() {
  static layerSql: Layer.Layer<MessageStore, never, SqlClient.SqlClient> = Layer.scoped(
    MessageStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // Schema creation is a fatal store-construction failure, not a recoverable per-op error.
      yield* migrate(sql).pipe(Effect.orDie);
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

  static layerMemory: Layer.Layer<MessageStore> = Layer.sync(MessageStore, () => {
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
}
