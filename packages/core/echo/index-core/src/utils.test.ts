//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  MAX_CHUNKED_STATEMENTS,
  SQL_CHUNK_SIZE,
  SQL_MAX_BOUND_VARIABLES,
  chunkRows,
  chunkSizeForBoundVariables,
  isUnauthorizedFunctionError,
  mergeChunkedRows,
  planChunkPairs,
  planChunks,
} from './utils.ts';

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

describe('chunk planning', () => {
  const unitCost = (): number => 1;

  test('no items plan no chunks, so a caller answers empty rather than IN ()', ({ expect }) => {
    expect(planChunks([], unitCost, 5)).toEqual([]);
    expect(planChunkPairs({ items: [], costOf: unitCost }, { items: [1], costOf: unitCost }, 5)).toEqual([]);
    expect(planChunkPairs({ items: [1], costOf: unitCost }, { items: [], costOf: unitCost }, 5)).toEqual([]);
  });

  test('chunks fill up to the budget by summed cost', ({ expect }) => {
    const costs = [1, 2, 2, 1, 3, 1];
    expect(planChunks(costs, (cost) => cost, 4)).toEqual([
      [1, 2],
      [2, 1],
      [3, 1],
    ]);
    for (const size of [4, 5, 9, 10, 11]) {
      const items = Array.from({ length: size }, (_, index) => index);
      const chunks = planChunks(items, unitCost, 5);
      expect(chunks.flat()).toEqual(items);
      expect(chunks.every((chunk) => chunk.length <= 5)).toBe(true);
    }
  });

  test('an item wider than the whole budget is refused rather than emitted as one over-wide statement', ({
    expect,
  }) => {
    expect(() => planChunks([1, 6], (cost) => cost, 5)).toThrow();
    // Each fits alone, but no statement holds the outer item beside the widest inner one.
    expect(() =>
      planChunkPairs({ items: [6], costOf: (cost) => cost }, { items: [1, 5], costOf: (cost) => cost }, 10),
    ).toThrow();
  });

  test('a pair of lists leaves each outer chunk room for the widest inner item', ({ expect }) => {
    const pairs = planChunkPairs(
      { items: [2, 2, 2], costOf: (cost) => cost },
      { items: [1, 1, 1, 1], costOf: (cost) => cost },
      5,
    );
    for (const [outer, inner] of pairs) {
      expect([...outer, ...inner].reduce((sum, cost) => sum + cost, 0)).toBeLessThanOrEqual(5);
    }
    // Every pairing of an outer item with an inner item is covered exactly once.
    expect(pairs.flatMap(([outer, inner]) => outer.flatMap(() => inner)).length).toBe(3 * 4);
  });

  test('a pair of lists is cut for the fewest statements rather than packing the outer list full', ({ expect }) => {
    // Versionless types bind four variables and spaces one. `queryTypes` without a window binds
    // nothing else; a full-text read also binds its match text.
    const cases = [
      { fixed: 0, types: 24, spaces: 100, statements: 4 },
      { fixed: 0, types: 25, spaces: 250, statements: 11 },
      { fixed: 0, types: 30, spaces: 300, statements: 15 },
      { fixed: 1, types: 24, spaces: 100, statements: 4 },
      { fixed: 1, types: 25, spaces: 250, statements: 11 },
      { fixed: 1, types: 30, spaces: 300, statements: 16 },
    ];
    for (const { fixed, types, spaces, statements } of cases) {
      const budget = SQL_MAX_BOUND_VARIABLES - fixed;
      const typeIds = Array.from({ length: types }, (_, index) => index);
      const spaceIds = Array.from({ length: spaces }, (_, index) => index);
      const pairs = planChunkPairs({ items: typeIds, costOf: () => 4 }, { items: spaceIds, costOf: unitCost }, budget);

      const label = `${types} types x ${spaces} spaces in ${budget} variables`;
      expect(pairs, label).toHaveLength(statements);
      for (const [outer, inner] of pairs) {
        expect(outer.length * 4 + inner.length, label).toBeLessThanOrEqual(budget);
      }
      const covered = pairs.flatMap(([outer, inner]) =>
        outer.flatMap((type) => inner.map((space) => `${type}/${space}`)),
      );
      expect(covered, label).toHaveLength(types * spaces);
      expect(new Set(covered).size, label).toBe(types * spaces);
    }
  });

  test('a mixed-cost outer list is cut where no single outer budget would cut it', ({ expect }) => {
    // Versioned types bind one variable and versionless ones four. Filling every outer chunk to one
    // budget needs at least 31 statements here; pairing the cuts to the costs needs 28.
    const typeCost = (type: number): number => (type % 2 === 0 ? 1 : 4);
    const typeIds = Array.from({ length: 16 }, (_, index) => index);
    const spaceIds = Array.from({ length: 16 }, (_, index) => index);
    const pairs = planChunkPairs({ items: typeIds, costOf: typeCost }, { items: spaceIds, costOf: unitCost }, 10);

    expect(pairs).toHaveLength(28);
    for (const [outer, inner] of pairs) {
      expect(outer.reduce((sum, type) => sum + typeCost(type), 0) + inner.length).toBeLessThanOrEqual(10);
    }
    const covered = pairs.flatMap(([outer, inner]) =>
      outer.flatMap((type) => inner.map((space) => `${type}/${space}`)),
    );
    expect(new Set(covered).size).toBe(covered.length);
    expect(covered).toHaveLength(16 * 16);
  });

  test('a read needing more statements than the cap fails instead of issuing them', ({ expect }) => {
    const items = Array.from({ length: MAX_CHUNKED_STATEMENTS + 1 }, (_, index) => index);
    expect(planChunks(items.slice(1), unitCost, 1)).toHaveLength(MAX_CHUNKED_STATEMENTS);
    expect(() => planChunks(items, unitCost, 1)).toThrow();
    expect(() =>
      planChunkPairs({ items: items.slice(0, 9), costOf: unitCost }, { items: items.slice(0, 9), costOf: unitCost }, 2),
    ).toThrow();
  });

  test('merging keeps the first row per record, then orders and cuts', ({ expect }) => {
    const merged = mergeChunkedRows(
      [
        [
          { recordId: 3, rank: 1 },
          { recordId: 1, rank: 2 },
        ],
        [
          { recordId: 1, rank: 2 },
          { recordId: 2, rank: 3 },
        ],
      ],
      { compare: (left, right) => right.rank - left.rank || left.recordId - right.recordId, limit: 2 },
    );
    expect(merged).toEqual([
      { recordId: 2, rank: 3 },
      { recordId: 1, rank: 2 },
    ]);
  });
});

describe('isUnauthorizedFunctionError', () => {
  test('matches the authorizer refusal nested under the driver error', ({ expect }) => {
    const denied = new Error('not authorized to use function: sqlite_version at offset 7: SQLITE_ERROR');
    const driver = new Error('Failed to execute statement', {
      cause: new Error('Failed to execute statement', { cause: denied }),
    });
    expect(isUnauthorizedFunctionError(driver)).toBe(true);
  });

  test('does not match other SQL failures', ({ expect }) => {
    expect(isUnauthorizedFunctionError(new Error('Failed', { cause: new Error('no such table: objectMeta') }))).toBe(
      false,
    );
    expect(isUnauthorizedFunctionError(undefined)).toBe(false);
  });
});
