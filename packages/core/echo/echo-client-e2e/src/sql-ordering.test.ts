//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Order, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

/**
 * Mixed case is what separates the two collations: `localeCompare` is case-insensitive at the
 * primary level, SQLite's default `BINARY` compares code units, so every upper-case initial sorts
 * before every lower-case one.
 */
const TITLES = ['apple', 'Banana', 'cherry', 'Date', 'elderberry'];

describe('ordering agrees across executors', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Titles in the order each executor returns them, over identical data. */
  const orderedTitles = async (queryExecutor: 'sql' | 'memory', limit?: number): Promise<string[]> => {
    const peer = await builder.createPeer({ types: [TestSchema.Task], queryExecutor });
    const db = await peer.createDatabase();
    for (const title of TITLES) {
      db.add(Obj.make(TestSchema.Task, { title }));
    }
    await db.flush({ indexes: true });

    const ordered = Query.select(Filter.type(TestSchema.Task)).orderBy(Order.property('title', 'asc'));
    const objects = await db.query(limit === undefined ? ordered : ordered.limit(limit)).run();
    return objects.map((object) => object.title as string);
  };

  // `test.fails` because the paths do not agree yet and the fix is a pending decision: SQLite
  // orders by `BINARY`, the in-memory comparator by `localeCompare`. Flips to failing — the signal
  // to delete these annotations — as soon as one side moves to the other's collation.
  test.fails('orderBy(property) returns the same order on both paths', async () => {
    expect(await orderedTitles('sql')).toEqual(await orderedTitles('memory'));
  });

  // The limit is what turns an ordering difference into a different result set: the rows the two
  // paths cut are not the same rows.
  test.fails('orderBy(property).limit(n) returns the same rows on both paths', async () => {
    expect(await orderedTitles('sql', 2)).toEqual(await orderedTitles('memory', 2));
  });
});
