//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { StoreError } from '../errors';

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

export interface ExtractedQuestionStoreApi {
  /** Idempotent upsert keyed on (messageId, question). */
  readonly put: (question: ExtractedQuestion) => Effect.Effect<void, StoreError>;
  readonly list: (targetId?: string) => Effect.Effect<ExtractedQuestion[], StoreError>;
}

const fail = (message: string) => (cause: unknown) => new StoreError({ message, cause });

const migrate = (sql: SqlClient.SqlClient) =>
  sql`CREATE TABLE IF NOT EXISTS extracted_question (
    message_id TEXT NOT NULL,
    question TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_label TEXT,
    target_id TEXT NOT NULL,
    asked_at TEXT,
    PRIMARY KEY (message_id, question)
  )`;

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

export class ExtractedQuestionStore extends Context.Tag('@dxos/pipeline-discord/ExtractedQuestionStore')<
  ExtractedQuestionStore,
  ExtractedQuestionStoreApi
>() {
  static layerSql: Layer.Layer<ExtractedQuestionStore, never, SqlClient.SqlClient> = Layer.scoped(
    ExtractedQuestionStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate(sql).pipe(Effect.orDie);
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

  static layerMemory: Layer.Layer<ExtractedQuestionStore> = Layer.sync(ExtractedQuestionStore, () => {
    const byKey = new Map<string, ExtractedQuestion>();
    return {
      put: (question) => Effect.sync(() => void byKey.set(`${question.messageId}#${question.question}`, question)),
      list: (targetId) =>
        Effect.sync(() =>
          [...byKey.values()]
            .filter((question) => targetId === undefined || question.targetId === targetId)
            .sort((left, right) => left.messageId.localeCompare(right.messageId)),
        ),
    };
  });
}
