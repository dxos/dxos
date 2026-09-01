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
import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/extracted-question/index.ts';

/** A question a user asked in a message: the (user × channel × message × question) record. */
export type ExtractedQuestion = {
  readonly authorId: string;
  readonly authorLabel?: string;
  /** Crawl target (channel or thread) the message belongs to. */
  readonly targetId: string;
  readonly messageId: string;
  readonly question: string;
  /** ISO-8601 message time, when known. */
  readonly askedAt?: string;
};

export interface Service {
  /** Idempotent upsert keyed on (messageId, question). */
  readonly put: (question: ExtractedQuestion) => Effect.Effect<void, StoreError>;
  readonly list: (targetId?: string) => Effect.Effect<ExtractedQuestion[], StoreError>;
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
    Effect.withSpan('discord.extractedQuestionStore.migrate'),
  );

type Row = {
  readonly message_id: string;
  readonly question: string;
  readonly author_id: string;
  readonly author_label: string | null;
  readonly target_id: string;
  readonly asked_at: string | null;
};

const toQuestion = (row: Row): ExtractedQuestion => ({
  authorId: row.author_id,
  ...(row.author_label !== null ? { authorLabel: row.author_label } : {}),
  targetId: row.target_id,
  messageId: row.message_id,
  question: row.question,
  ...(row.asked_at !== null ? { askedAt: row.asked_at } : {}),
});

export class ExtractedQuestionStore extends Context.Service<ExtractedQuestionStore, Service>()(
  '@dxos/pipeline-discord/ExtractedQuestionStore',
) {}

export const layerSql: Layer.Layer<ExtractedQuestionStore, never, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =
  Layer.effect(
    ExtractedQuestionStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate().pipe(Effect.orDie);
      return {
        put: (question) =>
          sql`INSERT INTO extracted_question (message_id, question, author_id, author_label, target_id, asked_at)
          VALUES (${question.messageId}, ${question.question}, ${question.authorId},
            ${question.authorLabel ?? null}, ${question.targetId}, ${question.askedAt ?? null})
          ON CONFLICT(message_id, question) DO NOTHING`.pipe(
            Effect.asVoid,
            Effect.mapError(fail('Failed to persist extracted question')),
          ),
        list: (targetId) =>
          (targetId !== undefined
            ? sql<Row>`SELECT * FROM extracted_question WHERE target_id = ${targetId} ORDER BY message_id ASC`
            : sql<Row>`SELECT * FROM extracted_question ORDER BY message_id ASC`
          ).pipe(
            Effect.map((rows) => rows.map(toQuestion)),
            Effect.mapError(fail('Failed to list extracted questions')),
          ),
      };
    }),
  );

export const layerMemory: Layer.Layer<ExtractedQuestionStore> = Layer.sync(ExtractedQuestionStore, () => {
  const byKey = new Map<string, ExtractedQuestion>();
  return {
    put: (question) =>
      Effect.sync(() => {
        // First write wins, matching the SQL layer's `ON CONFLICT … DO NOTHING`.
        const key = `${question.messageId}#${question.question}`;
        if (!byKey.has(key)) {
          byKey.set(key, question);
        }
      }),
    list: (targetId) =>
      Effect.sync(() =>
        [...byKey.values()]
          .filter((question) => targetId === undefined || question.targetId === targetId)
          .sort((left, right) => left.messageId.localeCompare(right.messageId)),
      ),
  };
});

export const put = (...args: Parameters<Service['put']>) => ExtractedQuestionStore.use((store) => store.put(...args));
export const list = (...args: Parameters<Service['list']>) =>
  ExtractedQuestionStore.use((store) => store.list(...args));
