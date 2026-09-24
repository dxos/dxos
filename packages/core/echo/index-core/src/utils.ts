//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as Statement from 'effect/unstable/sql/Statement';

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

/**
 * True for SQLite's authorizer refusing a function call, which Durable Object SQLite does for
 * introspection functions such as `sqlite_version()`; the driver nests the message under `cause`.
 */
export const isUnauthorizedFunctionError = (err: unknown): boolean => {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current instanceof Object; depth++) {
    if (
      'message' in current &&
      typeof current.message === 'string' &&
      /not authorized to use function/i.test(current.message)
    ) {
      return true;
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
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
 * The bound-variable limit chunked reads plan against. A reference rather than
 * {@link SQL_MAX_BOUND_VARIABLES} itself so tests can shrink it: node SQLite accepts far wider
 * statements, and only a small limit drives the multi-statement paths there.
 */
export const SqlBoundVariableLimit: Context.Reference<number> = Context.Reference<number>(
  '@dxos/index-core/SqlBoundVariableLimit',
  { defaultValue: () => SQL_MAX_BOUND_VARIABLES },
);

/** Most statements one chunked read may issue; a read wider than that fails instead. */
export const MAX_CHUNKED_STATEMENTS = 64;

/** Variables a fragment binds, measured by compiling it so the count cannot drift from the SQL. */
export const countBoundVariables = (sql: SqlClient.SqlClient, fragment: Statement.Fragment): number =>
  sql`${fragment}`.compile()[1].length;

/**
 * Splits `items` into consecutive chunks whose summed `costOf` fits `budget`, so a list too wide for
 * one statement is read by several. No items plan no chunks: the caller answers empty rather than
 * degrade to `IN ()` or drop the condition and match everything.
 */
export const planChunks = <T>(items: readonly T[], costOf: (item: T) => number, budget: number): T[][] => {
  const chunks: T[][] = [];
  let chunk: T[] = [];
  let chunkCost = 0;
  for (const item of items) {
    const cost = costOf(item);
    // Refused rather than emitted as one over-wide statement, which is how the 2026-09-22 outage shipped.
    invariant(cost <= budget, `one item binds ${cost} variables but a statement has ${budget} left`);
    if (chunkCost + cost > budget) {
      chunks.push(chunk);
      chunk = [];
      chunkCost = 0;
    }
    chunk.push(item);
    chunkCost += cost;
  }
  if (chunk.length > 0) {
    chunks.push(chunk);
  }
  invariant(chunks.length <= MAX_CHUNKED_STATEMENTS, `a read needs ${chunks.length} statements`);
  return chunks;
};

/** A list a read is restricted to, with what each of its items binds. */
export type ChunkPlanInput<T> = {
  readonly items: readonly T[];
  readonly costOf: (item: T) => number;
};

/**
 * Plans a read restricted by two lists at once: each chunk of `outer` pairs with every chunk of
 * `inner` planned in the budget that outer chunk leaves.
 */
export const planChunkPairs = <A, B>(
  outer: ChunkPlanInput<A>,
  inner: ChunkPlanInput<B>,
  budget: number,
): (readonly [A[], B[]])[] => {
  const widestInner = inner.items.reduce((widest, item) => Math.max(widest, inner.costOf(item)), 0);
  const pairs: (readonly [A[], B[]])[] = [];
  for (const outerChunk of planChunks(outer.items, outer.costOf, budget - widestInner)) {
    const outerCost = outerChunk.reduce((sum, item) => sum + outer.costOf(item), 0);
    for (const innerChunk of planChunks(inner.items, inner.costOf, budget - outerCost)) {
      pairs.push([outerChunk, innerChunk]);
    }
  }
  invariant(pairs.length <= MAX_CHUNKED_STATEMENTS, `a read needs ${pairs.length} statements`);
  return pairs;
};

/**
 * Merges the rows of a read issued as several statements: the first row per `recordId`, since
 * chunks of overlapping conditions can match a row twice; then ordered by `compare` and cut to
 * `limit`, which each statement could only apply to its own chunk.
 */
export const mergeChunkedRows = <T extends { readonly recordId: number }>(
  results: readonly (readonly T[])[],
  { compare, limit }: { compare?: (left: T, right: T) => number; limit?: number } = {},
): T[] => {
  const byRecordId = new Map<number, T>();
  for (const rows of results) {
    for (const row of rows) {
      if (!byRecordId.has(row.recordId)) {
        byRecordId.set(row.recordId, row);
      }
    }
  }
  const merged = [...byRecordId.values()];
  if (compare) {
    merged.sort(compare);
  }
  return limit === undefined ? merged : merged.slice(0, limit);
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
