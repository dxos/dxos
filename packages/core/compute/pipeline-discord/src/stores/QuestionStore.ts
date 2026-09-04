//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Clock from 'effect/Clock';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { SqlTransaction } from '@dxos/sql-sqlite';

import { StoreError } from '../errors';
import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/question';

export type QuestionStatus = 'open' | 'answered';

/** A standing user question the pipeline attempts to answer as the fact graph grows. */
export type Question = {
  readonly id: string;
  readonly text: string;
  readonly status: QuestionStatus;
  readonly answer?: string;
  /** Fact/message ids supporting the answer (citations). */
  readonly supportingIds: readonly string[];
  /** Count of failed answer attempts — bounds redundant retries across many target boundaries. */
  readonly attempts: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export interface Service {
  /** Register a question (id defaults to a random UUID); returns the stored record. */
  readonly add: (text: string, id?: string) => Effect.Effect<Question, StoreError>;
  readonly get: (id: string) => Effect.Effect<Question | undefined, StoreError>;
  /** All questions (optionally filtered by status), oldest first. */
  readonly list: (status?: QuestionStatus) => Effect.Effect<Question[], StoreError>;
  /** Record an answer with its supporting ids and close the question. */
  readonly answer: (id: string, answer: string, supportingIds: readonly string[]) => Effect.Effect<void, StoreError>;
  /** Increment the failed-attempt counter for a question left open by an answer pass. */
  readonly recordAttempt: (id: string) => Effect.Effect<void, StoreError>;
}

const fail = (message: string) => (cause: unknown) => new StoreError({ message, cause });

const now = Clock.currentTimeMillis.pipe(Effect.map((millis) => new Date(millis).toISOString()));

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
    Effect.withSpan('discord.questionStore.migrate'),
  );

type Row = {
  readonly id: string;
  readonly text: string;
  readonly status: string;
  readonly answer: string | null;
  readonly supporting_ids: string;
  readonly attempts: number;
  readonly created_at: string;
  readonly updated_at: string;
};

const parseSupportingIds = (value: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
};

const toQuestion = (row: Row): Question => ({
  id: row.id,
  text: row.text,
  status: row.status === 'answered' ? 'answered' : 'open',
  ...(row.answer !== null ? { answer: row.answer } : {}),
  supportingIds: parseSupportingIds(row.supporting_ids),
  attempts: Number(row.attempts ?? 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class QuestionStore extends Context.Service<QuestionStore, Service>()('@dxos/pipeline-discord/QuestionStore') {}

export const layerSql: Layer.Layer<QuestionStore, never, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =
  Layer.effect(
    QuestionStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate().pipe(Effect.orDie);
      return {
        add: (text, id) =>
          Effect.gen(function* () {
            const timestamp = yield* now;
            const question: Question = {
              id: id ?? crypto.randomUUID(),
              text,
              status: 'open',
              supportingIds: [],
              attempts: 0,
              createdAt: timestamp,
              updatedAt: timestamp,
            };
            yield* sql`INSERT INTO question (id, text, status, supporting_ids, attempts, created_at, updated_at)
            VALUES (${question.id}, ${question.text}, 'open', '[]', 0, ${timestamp}, ${timestamp})`;
            return question;
          }).pipe(Effect.mapError(fail('Failed to add question'))),
        get: (id) =>
          sql<Row>`SELECT * FROM question WHERE id = ${id}`.pipe(
            Effect.map((rows) => (rows[0] ? toQuestion(rows[0]) : undefined)),
            Effect.mapError(fail('Failed to read question')),
          ),
        list: (status) =>
          (status !== undefined
            ? sql<Row>`SELECT * FROM question WHERE status = ${status} ORDER BY created_at ASC, id ASC`
            : sql<Row>`SELECT * FROM question ORDER BY created_at ASC, id ASC`
          ).pipe(
            Effect.map((rows) => rows.map(toQuestion)),
            Effect.mapError(fail('Failed to list questions')),
          ),
        answer: (id, answer, supportingIds) =>
          Effect.gen(function* () {
            const timestamp = yield* now;
            yield* sql`UPDATE question SET status = 'answered', answer = ${answer},
            supporting_ids = ${JSON.stringify(supportingIds)}, updated_at = ${timestamp} WHERE id = ${id}`;
          }).pipe(Effect.asVoid, Effect.mapError(fail('Failed to answer question'))),
        recordAttempt: (id) =>
          Effect.gen(function* () {
            const timestamp = yield* now;
            yield* sql`UPDATE question SET attempts = attempts + 1, updated_at = ${timestamp} WHERE id = ${id}`;
          }).pipe(Effect.asVoid, Effect.mapError(fail('Failed to record question attempt'))),
      };
    }),
  );

export const layerMemory: Layer.Layer<QuestionStore> = Layer.sync(QuestionStore, () => {
  const byId = new Map<string, Question>();
  return {
    add: (text, id) =>
      Effect.gen(function* () {
        const timestamp = yield* now;
        const question: Question = {
          id: id ?? crypto.randomUUID(),
          text,
          status: 'open',
          supportingIds: [],
          attempts: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        if (byId.has(question.id)) {
          // `question.id` is a primary key, so the SQL layer fails this insert rather than replacing.
          return yield* Effect.fail(
            new StoreError({ message: 'Failed to add question', cause: `duplicate question id ${question.id}` }),
          );
        }
        byId.set(question.id, question);
        return question;
      }),
    get: (id) => Effect.sync(() => byId.get(id)),
    list: (status) =>
      Effect.sync(() =>
        [...byId.values()]
          .filter((question) => status === undefined || question.status === status)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
      ),
    answer: (id, answer, supportingIds) =>
      Effect.gen(function* () {
        const timestamp = yield* now;
        const question = byId.get(id);
        if (question) {
          byId.set(id, {
            ...question,
            status: 'answered',
            answer,
            supportingIds: [...supportingIds],
            updatedAt: timestamp,
          });
        }
      }),
    recordAttempt: (id) =>
      Effect.gen(function* () {
        const timestamp = yield* now;
        const question = byId.get(id);
        if (question) {
          byId.set(id, { ...question, attempts: question.attempts + 1, updatedAt: timestamp });
        }
      }),
  };
});

export const add = (...args: Parameters<Service['add']>) => QuestionStore.use((store) => store.add(...args));
export const get = (...args: Parameters<Service['get']>) => QuestionStore.use((store) => store.get(...args));
export const list = (...args: Parameters<Service['list']>) => QuestionStore.use((store) => store.list(...args));
export const answer = (...args: Parameters<Service['answer']>) => QuestionStore.use((store) => store.answer(...args));
export const recordAttempt = (...args: Parameters<Service['recordAttempt']>) =>
  QuestionStore.use((store) => store.recordAttempt(...args));
