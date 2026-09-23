//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';

export type EntityPropPath = string[];

/**
 * A property path with array-index segments removed, the form `reverseRef.propPathNormalized`
 * stores: `['items', '0', 'assignee']` and `['items', 'assignee']` name the same property.
 */
export const normalizePropPath = (path: readonly string[]): EntityPropPath =>
  path.filter((segment) => !/^[0-9]+$/.test(segment));

/**
 * Bound variables one statement may carry (`SQLITE_LIMIT_VARIABLE_NUMBER`).
 *
 * Sized for Durable Object SQLite, which is what production indexes against and which caps this at
 * 100 — a tenth of the node and wasm builds this package's own tests run on, so the lowest
 * supported runtime is the only safe bound.
 */
export const SQL_MAX_BOUND_VARIABLES = 100;

/**
 * Variables a statement may bind outside the chunked list — `spaceId = ${...}` and friends — so a
 * caller gets a usable chunk size without having to count its own predicates.
 */
const RESERVED_BOUND_VARIABLES = 8;

/** Rows one statement may carry when each binds `variablesPerRow` variables. */
export const chunkSizeForBoundVariables = (variablesPerRow: number): number => {
  invariant(Number.isInteger(variablesPerRow) && variablesPerRow > 0, 'variables per row must be a positive integer');
  return Math.max(1, Math.floor((SQL_MAX_BOUND_VARIABLES - RESERVED_BOUND_VARIABLES) / variablesPerRow));
};

/** Chunk size for a list binding one variable per element, as `IN (...)` does. */
export const SQL_CHUNK_SIZE: number = chunkSizeForBoundVariables(1);

/**
 * Split rows for a multi-row `sql.insert`, sizing the batch by the columns the rows actually
 * carry — so adding a column narrows the batch instead of silently overrunning the limit.
 */
export const chunkRows = <T extends Record<string, unknown>>(rows: readonly T[]): T[][] =>
  rows.length === 0 ? [] : chunkArray(rows, chunkSizeForBoundVariables(Object.keys(rows[0]).length));

/** Split an array into chunks of at most `size` for batched SQL `IN (...)` clauses. */
export const chunkArray = <T>(items: readonly T[], size: number = SQL_CHUNK_SIZE): T[][] => {
  // A non-positive or fractional size would fail to advance the loop and spin forever.
  invariant(Number.isInteger(size) && size > 0, 'chunk size must be a positive integer');
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

/**
 * Escaped property path within an object.
 *
 * Escaping rules:
 *
 * - '.' -> '\.'
 * - '\' -> '\\'
 * - contact with .
 */
export const EscapedPropPath: Schema.Codec<string, string> & {
  escape: (path: EntityPropPath) => EscapedPropPath;
  unescape: (path: EscapedPropPath) => EntityPropPath;
} = class extends Schema.String.annotate({ title: 'EscapedPropPath' }) {
  static escape(path: EntityPropPath): EscapedPropPath {
    return path.map((p) => p.toString().replaceAll('\\', '\\\\').replaceAll('.', '\\.')).join('.');
  }

  static unescape(path: EscapedPropPath): EntityPropPath {
    const parts: string[] = [];
    let current = '';

    for (let i = 0; i < path.length; i++) {
      if (path[i] === '\\') {
        invariant(i + 1 < path.length && (path[i + 1] === '.' || path[i + 1] === '\\'), 'Malformed escaping.');
        current = current + path[i + 1];
        i++;
      } else if (path[i] === '.') {
        parts.push(current);
        current = '';
      } else {
        current += path[i];
      }
    }
    parts.push(current);

    return parts;
  }
};
export type EscapedPropPath = Schema.Schema.Type<typeof EscapedPropPath>;
