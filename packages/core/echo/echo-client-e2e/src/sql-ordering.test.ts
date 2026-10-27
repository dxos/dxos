//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Annotation, Filter, Obj, Order, Query } from '@dxos/echo';
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

describe('annotation ordering agrees across executors', () => {
  const Rating = Annotation.make({ id: 'org.dxos.annotation.test-rating', schema: Schema.Number });
  const Distance = Annotation.make({
    id: 'org.dxos.annotation.test-distance',
    schema: Schema.Struct({ meters: Schema.optional(Schema.Number), label: Schema.String }),
  });

  /** Inserted out of order. `none` carries neither annotation; `unmeasured` has a distance without `meters`. */
  const RATED = ['c', 'a', 'e', 'b', 'd'];
  const RATINGS: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5 };
  const METERS: Record<string, number> = { a: 10, b: 20, c: 30, d: 40, e: 50 };

  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  type Window = { limit?: number; skip?: number };

  /** Titles in the order one executor returns them. */
  const run = async (queryExecutor: 'sql' | 'memory', order: Order.Any, window: Window): Promise<string[]> => {
    const peer = await builder.createPeer({ types: [TestSchema.Task], queryExecutor });
    const db = await peer.createDatabase();
    for (const title of RATED) {
      const task = db.add(Obj.make(TestSchema.Task, { title }));
      Obj.update(task, (task) => {
        Annotation.set(task, Rating, RATINGS[title]);
        Annotation.set(task, Distance, { meters: METERS[title], label: title });
      });
    }
    db.add(Obj.make(TestSchema.Task, { title: 'none' }));
    const unmeasured = db.add(Obj.make(TestSchema.Task, { title: 'unmeasured' }));
    Obj.update(unmeasured, (unmeasured) => Annotation.set(unmeasured, Distance, { label: 'x' }));
    await db.flush({ indexes: true });

    const ordered = Query.select(Filter.type(TestSchema.Task)).orderBy(order);
    const skipped = window.skip === undefined ? ordered : ordered.skip(window.skip);
    const query = window.limit === undefined ? skipped : skipped.limit(window.limit);
    const objects = await db.query(query).run();
    return objects.map((object) => String(object.title));
  };

  /**
   * Runs both executors and checks they agree. Entities without a value tie, and each run creates
   * its own (randomly-identified) entities, so that tail is compared as a set.
   */
  const both = async (
    order: Order.Any,
    window: Window = {},
    valueless: readonly string[] = ['none', 'unmeasured'],
  ): Promise<{ ordered: string[]; nulls: string[] }> => {
    const split = (titles: string[]) => {
      const nullsFrom = titles.findIndex((title) => valueless.includes(title));
      const cut = nullsFrom === -1 ? titles.length : nullsFrom;
      return { ordered: titles.slice(0, cut), nulls: titles.slice(cut).sort() };
    };
    const sql = split(await run('sql', order, window));
    expect(split(await run('memory', order, window))).toEqual(sql);
    return sql;
  };

  test('by a numeric annotation, missing last, ascending', async () => {
    expect(await both(Order.annotation(Rating, 'asc'))).toEqual({
      ordered: ['a', 'b', 'c', 'd', 'e'],
      nulls: ['none', 'unmeasured'],
    });
  });

  test('by a numeric annotation, missing last, descending', async () => {
    expect(await both(Order.annotation(Rating, 'desc'))).toEqual({
      ordered: ['e', 'd', 'c', 'b', 'a'],
      nulls: ['none', 'unmeasured'],
    });
  });

  test('by a path into a struct annotation', async () => {
    expect(await both(Order.annotation(Distance, 'asc', ['meters']))).toEqual({
      ordered: ['a', 'b', 'c', 'd', 'e'],
      nulls: ['none', 'unmeasured'],
    });
    expect(await both(Order.annotation(Distance, 'desc', ['meters']))).toEqual({
      ordered: ['e', 'd', 'c', 'b', 'a'],
      nulls: ['none', 'unmeasured'],
    });
  });

  test('by a string field of a struct annotation', async () => {
    // `unmeasured` has a label, so it joins the ordered run; `x` sorts after every other label.
    expect(await both(Order.annotation(Distance, 'desc', ['label']), {}, ['none'])).toEqual({
      ordered: ['unmeasured', 'e', 'd', 'c', 'b', 'a'],
      nulls: ['none'],
    });
  });

  test('windowed read with limit and skip', async () => {
    expect(await both(Order.annotation(Rating, 'asc'), { limit: 2 })).toEqual({ ordered: ['a', 'b'], nulls: [] });
    expect(await both(Order.annotation(Rating, 'desc'), { skip: 1, limit: 3 })).toEqual({
      ordered: ['d', 'c', 'b'],
      nulls: [],
    });
    expect(await both(Order.annotation(Distance, 'asc', ['meters']), { skip: 3, limit: 2 })).toEqual({
      ordered: ['d', 'e'],
      nulls: [],
    });
  });
});
