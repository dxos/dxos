//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

/**
 * Splits a SQL script into individual statements.
 *
 * Migration scripts arrive as whole files (generated from a prisma schema, imported with
 * `?raw`), but the SQL client prepares one statement per call. Splitting on `;` alone is wrong
 * because a semicolon can appear inside a string literal, a quoted identifier, or a comment.
 *
 * Comments are dropped, and each is replaced by whitespace so surrounding tokens cannot merge.
 */
export const splitStatements = (script: string): string[] => {
  const statements: string[] = [];
  let current = '';
  let index = 0;

  const push = () => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      statements.push(trimmed);
    }
    current = '';
  };

  while (index < script.length) {
    const char = script[index];

    if (char === '-' && script[index + 1] === '-') {
      const end = script.indexOf('\n', index);
      index = end === -1 ? script.length : end + 1;
      current += '\n';
      continue;
    }

    if (char === '/' && script[index + 1] === '*') {
      const end = script.indexOf('*/', index + 2);
      index = end === -1 ? script.length : end + 2;
      current += ' ';
      continue;
    }

    // Copy quoted spans verbatim so a delimiter inside them is not treated as one. A doubled
    // quote is SQL's escape for a literal quote, so it does not close the span.
    if (char === "'" || char === '"') {
      current += char;
      index++;
      while (index < script.length) {
        if (script[index] === char) {
          if (script[index + 1] === char) {
            current += char + char;
            index += 2;
            continue;
          }
          current += char;
          index++;
          break;
        }
        current += script[index];
        index++;
      }
      continue;
    }

    if (char === ';') {
      push();
      index++;
      continue;
    }

    current += char;
    index++;
  }

  push();
  return statements;
};

/**
 * Applies migration scripts in order, one statement at a time.
 *
 * Scripts are expected to be idempotent (`CREATE TABLE IF NOT EXISTS`), since stores run their
 * migration on every open and there is no version table recording what was already applied.
 *
 * DDL is spliced in with `sql.literal`, since an interpolated string would otherwise be sent as
 * a bound parameter rather than as SQL.
 *
 * @example
 * ```typescript
 * import schema from './migrations/schema.sql?raw';
 *
 * yield* SqlMigrations.apply(schema);
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
