//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Queue from 'effect/Queue';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import * as SqlError from 'effect/sql/SqlError';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/sql-service/index.ts';
import { sanitize } from './sql-sanitizer.ts';

export type Row = Readonly<Record<string, unknown>>;

export type ExecuteRequest = {
  readonly database: string;
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
  /** Id from `begin`; the statement runs inside that transaction. */
  readonly transaction?: string;
};

const OBJECTS_TABLE = 'dx_sql_service_objects';

/** An open transaction holds the connection's lock, so an abandoned one must not block the host for long. */
const TRANSACTION_IDLE_TIMEOUT = '10 seconds';

type Command =
  | {
      readonly _tag: 'execute';
      readonly request: ExecuteRequest;
      readonly reply: Deferred.Deferred<ReadonlyArray<Row>, SqlError.SqlError>;
    }
  | { readonly _tag: 'end'; readonly commit: boolean; readonly reply: Deferred.Deferred<void, SqlError.SqlError> };

type Session = {
  readonly database: string;
  readonly queue: Queue.Queue<Command>;
  /** Replies not yet answered; failed together when the session ends. */
  readonly pending: Set<Deferred.Deferred<any, SqlError.SqlError>>;
  closed: boolean;
};

class Rollback {
  readonly _tag = 'Rollback';
}

const toSqlError = (cause: Cause.Cause<unknown>): SqlError.SqlError => {
  const error = Cause.squash(cause);
  return SqlError.isSqlError(error)
    ? error
    : new SqlError.SqlError({ reason: new SqlError.UnknownError({ cause: error, message: 'Transaction failed' }) });
};

export const authorizationError = (message: string): SqlError.SqlError =>
  new SqlError.SqlError({
    reason: new SqlError.AuthorizationError({ cause: new Error(message), message, operation: 'sanitize' }),
  });

/**
 * Executes sanitized statements on a shared SqlClient.
 * Every schema object is owned by the database that created it (recorded in `dx_sql_service_objects`);
 * a statement that names an object owned by another database, or by the host, is rejected.
 */
export const makeGuardedExecutor = Effect.fn('SqlService.makeGuardedExecutor')(function* () {
  const sql = yield* SqlClient.SqlClient;
  const scope = yield* Effect.scope;
  const sessions = new Map<string, Session>();
  yield* Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
    Effect.mapError((error) =>
      error instanceof SqlError.SqlError
        ? error
        : new SqlError.SqlError({
            reason: new SqlError.UnknownError({ cause: error, message: 'SqlService migration failed' }),
          }),
    ),
  );

  const owners = (names: readonly string[]) =>
    sql
      .unsafe<{ name: string; owner: string | null }>(
        `SELECT lower(m.name) AS name, o.database AS owner FROM sqlite_master m ` +
          `LEFT JOIN ${OBJECTS_TABLE} o ON o.name = lower(m.name) ` +
          `WHERE lower(m.name) IN (${names.map(() => '?').join(', ')})`,
        names,
      )
      .pipe(Effect.map((rows) => new Map(rows.map((row) => [row.name, row.owner]))));

  const executeGuarded = Effect.fn('SqlService.execute')(function* ({
    database,
    sql: statement,
    params,
  }: ExecuteRequest) {
    const result = sanitize(statement);
    if (!result.ok) {
      return yield* authorizationError(result.reason);
    }

    const { tables, created, dropped, renamed } = result.analysis;
    if (tables.length > 0) {
      const existing = yield* owners(tables);
      for (const [name, owner] of existing) {
        if (owner !== database) {
          return yield* authorizationError(`Access to ${name} is not allowed.`);
        }
      }
    }

    const rows = yield* sql.unsafe<Row>(statement, params);

    if (created !== undefined) {
      yield* sql.unsafe(
        `INSERT OR IGNORE INTO ${OBJECTS_TABLE} (name, database) ` +
          `SELECT lower(name), ? FROM sqlite_master WHERE lower(name) = ?`,
        [database, created],
      );
    }
    if (renamed !== undefined) {
      yield* sql.unsafe(`UPDATE ${OBJECTS_TABLE} SET name = ? WHERE name = ? AND database = ?`, [
        renamed.to,
        renamed.from,
        database,
      ]);
    }
    if (dropped !== undefined) {
      // Dropping a table also drops its indexes and triggers.
      yield* sql.unsafe(
        `DELETE FROM ${OBJECTS_TABLE} WHERE database = ? AND name NOT IN (SELECT lower(name) FROM sqlite_master)`,
        [database],
      );
    }

    return rows;
  });

  /** Queues a command on its session; the session's fiber answers it inside the transaction. */
  const send = <A>(
    transaction: string,
    database: string | undefined,
    make: (reply: Deferred.Deferred<A, SqlError.SqlError>) => Command,
  ): Effect.Effect<A, SqlError.SqlError> =>
    Effect.gen(function* () {
      const reply = yield* Deferred.make<A, SqlError.SqlError>();
      const session = sessions.get(transaction);
      if (!session || session.closed || (database !== undefined && session.database !== database)) {
        return yield* authorizationError(`Unknown transaction ${transaction}.`);
      }
      session.pending.add(reply);
      yield* Queue.offer(session.queue, make(reply));
      return yield* Deferred.await(reply);
    });

  /**
   * Opens a transaction served by its own fiber, so it holds the client's transaction lock (the
   * connection semaphore locally, `storage.transaction` on a Durable Object) across separate calls.
   */
  const begin = Effect.fn('SqlService.begin')(function* ({ database }: { readonly database: string }) {
    const transaction = crypto.randomUUID();
    const started = yield* Deferred.make<void, SqlError.SqlError>();
    const session: Session = { database, queue: yield* Queue.unbounded<Command>(), pending: new Set(), closed: false };
    sessions.set(transaction, session);

    const serve = Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      while (true) {
        const command = yield* Queue.take(session.queue).pipe(
          Effect.timeoutOrElse({
            duration: TRANSACTION_IDLE_TIMEOUT,
            orElse: () => Effect.fail(authorizationError('Transaction rolled back after being idle.')),
          }),
        );
        if (command._tag === 'end') {
          if (command.commit) {
            return command;
          }
          return yield* Effect.fail(new Rollback());
        }
        session.pending.delete(command.reply);
        yield* executeGuarded(command.request).pipe(
          Effect.exit,
          Effect.flatMap((exit) => Deferred.done(command.reply, exit)),
        );
      }
    });

    yield* sql.withTransaction(serve).pipe(
      Effect.exit,
      Effect.flatMap((exit) =>
        Effect.gen(function* () {
          session.closed = true;
          sessions.delete(transaction);
          const rolledBack = Exit.isFailure(exit) && Cause.squash(exit.cause) instanceof Rollback;
          const result = Exit.isSuccess(exit) || rolledBack ? Exit.void : Exit.fail(toSqlError(exit.cause));
          yield* Deferred.done(started, result);
          for (const reply of session.pending) {
            yield* Deferred.done(reply, result);
          }
        }),
      ),
      Effect.forkIn(scope),
    );

    yield* Deferred.await(started);
    return { transaction };
  });

  const end = (commit: boolean) => (transaction: string) =>
    send<void>(transaction, undefined, (reply) => ({ _tag: 'end', commit, reply }));

  return {
    execute: (request: ExecuteRequest) =>
      request.transaction === undefined
        ? executeGuarded(request)
        : send<ReadonlyArray<Row>>(request.transaction, request.database, (reply) => ({
            _tag: 'execute',
            request,
            reply,
          })),
    begin,
    commit: ({ transaction }: { readonly transaction: string }) => end(true)(transaction),
    rollback: ({ transaction }: { readonly transaction: string }) => end(false)(transaction),
  };
});
