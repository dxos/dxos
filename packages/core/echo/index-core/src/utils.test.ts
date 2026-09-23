//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SQL_CHUNK_SIZE, SQL_MAX_BOUND_VARIABLES, chunkRows, chunkSizeForBoundVariables } from './utils.ts';

/** Bound variables a chunk of `rows` costs in a multi-row insert. */
const boundVariables = (rows: readonly Record<string, unknown>[]): number =>
  rows.length === 0 ? 0 : rows.length * Object.keys(rows[0]).length;

describe('bound-variable budgeting', () => {
  test('the budget stays within the measured Durable Object SQLite limit', ({ expect }) => {
    expect(SQL_MAX_BOUND_VARIABLES).toBe(100);
  });

  test('a single-variable list chunks below the limit', ({ expect }) => {
    expect(SQL_CHUNK_SIZE).toBeLessThan(SQL_MAX_BOUND_VARIABLES);
  });

  test('wider rows get proportionally smaller chunks', ({ expect }) => {
    for (const variablesPerRow of [1, 2, 3, 4, 8, 16]) {
      expect(chunkSizeForBoundVariables(variablesPerRow) * variablesPerRow).toBeLessThanOrEqual(
        SQL_MAX_BOUND_VARIABLES,
      );
    }
  });

  test('a row binding more variables than the whole budget still yields one row per statement', ({ expect }) => {
    expect(chunkSizeForBoundVariables(SQL_MAX_BOUND_VARIABLES * 2)).toBe(1);
  });

  test('a non-positive or fractional width is rejected rather than producing an empty chunk', ({ expect }) => {
    expect(() => chunkSizeForBoundVariables(0)).toThrow();
    expect(() => chunkSizeForBoundVariables(-1)).toThrow();
    expect(() => chunkSizeForBoundVariables(1.5)).toThrow();
  });
});

describe('chunkRows', () => {
  test('keeps every chunk of the snapshot upsert within the limit', ({ expect }) => {
    // 300 rows is the batch an indexing pass hands `update`; before the fix this went out as one
    // 250-row statement binding 500 variables, which Durable Object SQLite rejects outright.
    const rows = Array.from({ length: 300 }, (_unused, index) => ({ recordId: index, snapshot: '{}' }));
    const chunks = chunkRows(rows);

    expect(chunks.flat()).toEqual(rows);
    for (const chunk of chunks) {
      expect(boundVariables(chunk)).toBeLessThanOrEqual(SQL_MAX_BOUND_VARIABLES);
    }
  });

  test('a row type gaining a column narrows the batch instead of overrunning the limit', ({ expect }) => {
    const twoColumns = Array.from({ length: 300 }, (_unused, index) => ({ recordId: index, snapshot: '{}' }));
    const threeColumns = twoColumns.map((row) => ({ ...row, spaceId: 'space' }));

    // The anti-rot property: the width is read off the rows, so a new column costs rows per
    // statement rather than silently pushing the statement over the limit.
    expect(chunkRows(threeColumns)[0].length).toBeLessThan(chunkRows(twoColumns)[0].length);
    for (const chunk of chunkRows(threeColumns)) {
      expect(boundVariables(chunk)).toBeLessThanOrEqual(SQL_MAX_BOUND_VARIABLES);
    }
  });

  test('an empty batch produces no statements', ({ expect }) => {
    expect(chunkRows([])).toEqual([]);
  });
});
