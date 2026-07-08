//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import { StateError } from '../errors';
import { type RunStatus, type StateStoreApi } from '../StateStore';
import type * as Type from '../types';

/** Create the frontier + run-status tables (idempotent). */
export const migrate = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    yield* sql`CREATE TABLE IF NOT EXISTS crawl_target (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      thread_id TEXT,
      parent_message_id TEXT,
      depth INTEGER NOT NULL,
      position INTEGER NOT NULL,
      status TEXT NOT NULL,
      cursor TEXT,
      last_run_at TEXT,
      last_error TEXT
    )`;
    yield* sql`CREATE INDEX IF NOT EXISTS crawl_target_position ON crawl_target (position)`;
    yield* sql`CREATE TABLE IF NOT EXISTS crawl_run (id INTEGER PRIMARY KEY CHECK (id = 1), status TEXT NOT NULL)`;
    yield* sql`INSERT INTO crawl_run (id, status) VALUES (1, 'idle') ON CONFLICT(id) DO NOTHING`;
  });

type Row = {
  readonly id: string;
  readonly channel_id: string;
  readonly thread_id: string | null;
  readonly parent_message_id: string | null;
  readonly depth: number;
  readonly position: number;
  readonly status: string;
  readonly cursor: string | null;
  readonly last_run_at: string | null;
  readonly last_error: string | null;
};

// Stored rows are untyped; narrow by value so corrupt data degrades to a quarantined state
// instead of a lying type.
const parseTargetStatus = (value: string): Type.TargetStatus =>
  value === 'pending' || value === 'active' || value === 'done' ? value : 'error';

const parseRunStatus = (value: string): RunStatus =>
  value === 'idle' || value === 'running' || value === 'paused' || value === 'done' ? value : 'error';

const toTarget = (row: Row): Type.Target => ({
  id: row.id,
  channelId: row.channel_id,
  ...(row.thread_id !== null ? { threadId: row.thread_id } : {}),
  ...(row.parent_message_id !== null ? { parentMessageId: row.parent_message_id } : {}),
  depth: row.depth,
  status: parseTargetStatus(row.status),
  ...(row.cursor !== null ? { cursor: row.cursor } : {}),
  ...(row.last_run_at !== null ? { lastRunAt: row.last_run_at } : {}),
  ...(row.last_error !== null ? { lastError: row.last_error } : {}),
});

const fail = (message: string) => (cause: unknown) => new StateError({ message, cause });

export const makeSql = (sql: SqlClient.SqlClient): StateStoreApi => ({
  pushTargets: (targets) =>
    sql
      .withTransaction(
        Effect.forEach(
          targets,
          (target) =>
            sql`INSERT INTO crawl_target (id, channel_id, thread_id, parent_message_id, depth, position, status, cursor, last_error)
              VALUES (${target.id}, ${target.channelId}, ${target.threadId ?? null}, ${target.parentMessageId ?? null},
                ${target.depth}, (SELECT COALESCE(MAX(position), 0) + 1 FROM crawl_target), ${target.status},
                ${target.cursor ?? null}, ${target.lastError ?? null})
              ON CONFLICT(id) DO NOTHING`,
          { discard: true },
        ),
      )
      .pipe(Effect.mapError(fail('Failed to push targets'))),

  nextActionable: () =>
    sql<Row>`SELECT * FROM crawl_target WHERE status IN ('pending', 'active') ORDER BY position DESC LIMIT 1`.pipe(
      Effect.map((rows) => (rows[0] ? toTarget(rows[0]) : undefined)),
      Effect.mapError(fail('Failed to read frontier')),
    ),

  hasActionable: () =>
    sql<{ found: number }>`SELECT COUNT(*) AS found FROM crawl_target WHERE status IN ('pending', 'active')`.pipe(
      Effect.map((rows) => Number(rows[0]?.found ?? 0) > 0),
      Effect.mapError(fail('Failed to read frontier')),
    ),

  setCursor: (targetId, cursor) =>
    Effect.gen(function* () {
      // `last_error` is intentionally preserved: the sink commits per message, and an isolated
      // stage fault recorded on the target must survive later commits as a diagnostic.
      const lastRunAt = new Date(yield* Clock.currentTimeMillis).toISOString();
      yield* sql`UPDATE crawl_target SET cursor = ${cursor}, last_run_at = ${lastRunAt}
        WHERE id = ${targetId}`;
    }).pipe(Effect.asVoid, Effect.mapError(fail('Failed to set cursor'))),

  setStatus: (targetId, status, error) =>
    (error === undefined
      ? sql`UPDATE crawl_target SET status = ${status} WHERE id = ${targetId}`
      : sql`UPDATE crawl_target SET status = ${status}, last_error = ${error} WHERE id = ${targetId}`
    ).pipe(Effect.asVoid, Effect.mapError(fail('Failed to set status'))),

  listTargets: () =>
    sql<Row>`SELECT * FROM crawl_target ORDER BY position ASC`.pipe(
      Effect.map((rows) => rows.map(toTarget)),
      Effect.mapError(fail('Failed to list targets')),
    ),

  setRunStatus: (status) =>
    sql`UPDATE crawl_run SET status = ${status} WHERE id = 1`.pipe(
      Effect.asVoid,
      Effect.mapError(fail('Failed to set run status')),
    ),

  getRunStatus: () =>
    sql<{ status: string }>`SELECT status FROM crawl_run WHERE id = 1`.pipe(
      Effect.map((rows) => parseRunStatus(rows[0]?.status ?? 'idle')),
      Effect.mapError(fail('Failed to read run status')),
    ),
});
