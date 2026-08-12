//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

/** Quoted span, comment, or statement delimiter. Anything else is ordinary SQL text. */
const TOKEN = /'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\/|;/g;

/**
 * Splits a SQL script into statements.
 *
 * Needed because SQLite prepares one statement at a time and no platform client exposes an
 * `exec`-family call, so a multi-statement `.sql` file cannot be handed over whole.
 *
 * Quoted spans are copied verbatim and comments dropped, so a `;` inside either is not mistaken for
 * a delimiter. A line comment leaves its newline in place; a block comment becomes a space, so
 * neither merges the tokens either side of it.
 */
export const splitStatements = (script: string): string[] =>
  script
    // Rewrite only the tokens: real delimiters become NUL, comments collapse, quoted spans stand.
    // NUL is safe as a marker because SQLite rejects it in identifiers and no DDL contains one.
    .replace(TOKEN, (token) =>
      token === ';' ? '\0' : token.startsWith('--') ? '' : token.startsWith('/*') ? ' ' : token,
    )
    .split('\0')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

/**
 * Executes SQL scripts in order, one statement at a time.
 *
 * The raw executor: it runs everything it is given, every time, and records nothing. Recording what
 * has already been applied is `@effect/sql`'s `Migrator`; reach for `apply` directly only for one-off
 * or already-guarded SQL.
 *
 * DDL is spliced in with `sql.literal`, since an interpolated string would be sent as a bound
 * parameter rather than as SQL.
 *
 * @example
 * ```typescript
 * import init from './migrations/0001_init.sql?raw';
 *
 * yield* SqlMigrations.apply(init);
 * ```
 */
export const apply = (...scripts: ReadonlyArray<string>): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    for (const script of scripts) {
      for (const statement of splitStatements(script)) {
        yield* sql`${sql.literal(statement)}`;
      }
    }
  });
