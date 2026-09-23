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

  // Both executors order strings by code unit, so the shared order is SQLite's: every upper-case
  // initial before every lower-case one. Pinned as a literal, not just as an equality between the
  // two paths, so a comparator that drifts back to `localeCompare` fails here rather than silently
  // moving both.
  const CODE_UNIT_ORDER = ['Banana', 'Date', 'apple', 'cherry', 'elderberry'];

  test('orderBy(property) returns the same order on both paths', async () => {
    expect(await orderedTitles('sql')).toEqual(CODE_UNIT_ORDER);
    expect(await orderedTitles('memory')).toEqual(CODE_UNIT_ORDER);
  });

  // The limit is what turns an ordering difference into a different result set: the rows the two
  // paths cut are not the same rows.
  test('orderBy(property).limit(n) returns the same rows on both paths', async () => {
    expect(await orderedTitles('sql', 2)).toEqual(CODE_UNIT_ORDER.slice(0, 2));
    expect(await orderedTitles('memory', 2)).toEqual(CODE_UNIT_ORDER.slice(0, 2));
  });
});
