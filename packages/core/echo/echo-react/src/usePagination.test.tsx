//
// Copyright 2026 DXOS.org
//

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Database, Feed, Filter, Obj, Order, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { usePagination } from './usePagination';

describe('usePagination', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const appendPeople = async (feed: Feed.Feed, db: Database.Database, count: number) => {
    for (let i = 0; i < count; i++) {
      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: `person-${i}` })]);
    }
  };

  test('returns the newest page-size items, newest first', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 10);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(3);
    const { result } = renderHook(() => usePagination(db, query));

    await waitFor(() => {
      expect(result.current.items.map((person) => person.name)).toEqual(['person-9', 'person-8', 'person-7']);
    });
    expect(result.current.hasMore).toBe(true);
    expect(result.current.atHead).toBe(true);
  });

  test('getNext extends the window toward older items', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 10);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(3);
    const { result } = renderHook(() => usePagination(db, query));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(3);
    });

    result.current.getNext();

    await waitFor(() => {
      expect(result.current.items.map((person) => person.name)).toEqual([
        'person-9',
        'person-8',
        'person-7',
        'person-6',
        'person-5',
        'person-4',
      ]);
    });
  });

  test('a burst of synchronous getNext calls in the same tick only advances by one page', async () => {
    // Regression test: a virtualizer's `onChange` can fire multiple times for a single "scrolled
    // near the edge" event (once per newly-rendered row) before React re-renders with the new
    // range. `getNext`'s single-flight guard must hold across that whole burst, not just across
    // renders -- otherwise the window jumps by (burst size) pages instead of one.
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 30);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(3);
    const { result } = renderHook(() => usePagination(db, query));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(3);
    });

    // Simulate the burst: call getNext synchronously many times before any re-render happens.
    for (let i = 0; i < 10; i++) {
      result.current.getNext();
    }

    await waitFor(() => {
      // Exactly one page's worth of growth (3 + 3 = 6), not ten (3 + 10*3 = 33).
      expect(result.current.items).toHaveLength(6);
    });

    // Give any erroneous extra state updates a chance to land, then confirm it's still 6.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.items).toHaveLength(6);
  });

  test('hasMore becomes false once the start of the feed is loaded', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 5);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(3);
    const { result } = renderHook(() => usePagination(db, query));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(3);
    });
    expect(result.current.hasMore).toBe(true);

    result.current.getNext();

    await waitFor(() => {
      expect(result.current.items).toHaveLength(5);
    });
    expect(result.current.hasMore).toBe(false);
  });

  test('growing past maxWindowSize evicts the newest items and detaches from the head', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 20);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(5);
    const { result } = renderHook(() => usePagination(db, query, { maxWindowSize: 10 }));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(5);
    });
    expect(result.current.atHead).toBe(true);

    result.current.getNext(); // limit -> 10 (within maxWindowSize)
    await waitFor(() => expect(result.current.items).toHaveLength(10));
    expect(result.current.atHead).toBe(true);

    result.current.getNext(); // would exceed maxWindowSize -> skip grows instead, limit stays at 10
    await waitFor(() => {
      expect(result.current.items).toHaveLength(10);
      expect(result.current.atHead).toBe(false);
    });
    // Still bounded, and now shows older items (window slid past the newest 5).
    expect(result.current.items.map((person) => person.name)).toEqual([
      'person-14',
      'person-13',
      'person-12',
      'person-11',
      'person-10',
      'person-9',
      'person-8',
      'person-7',
      'person-6',
      'person-5',
    ]);

    result.current.jumpToHead();
    await waitFor(() => {
      expect(result.current.atHead).toBe(true);
      expect(result.current.items.map((person) => person.name)).toEqual([
        'person-19',
        'person-18',
        'person-17',
        'person-16',
        'person-15',
      ]);
    });
  });

  test('getNext past maxWindowSize does not transiently undershoot the window size', async () => {
    // Regression test: reading the query's synchronous `.results` immediately upon subscribing
    // (previously via `subscribe(cb, { fire: true })`) reflected whatever the underlying
    // `QueryResult` had buffered *before* its async re-query resolved for a newly advanced `skip`
    // -- e.g. going from `{skip:0,limit:10}` to `{skip:5,limit:10}` synchronously sliced only the
    // previous range's 10 items, undershooting to 5 until the new range's fetch resolved and
    // corrected it back to 10. That transient shrink was visible as a jump under the virtualizer
    // on every eviction step.
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 20);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(5);
    const lengths: number[] = [];
    const { result } = renderHook(() => {
      const paginated = usePagination(db, query, { maxWindowSize: 10 });
      lengths.push(paginated.items.length);
      return paginated;
    });

    await waitFor(() => expect(result.current.items).toHaveLength(5));
    result.current.getNext(); // limit -> 10 (within maxWindowSize)
    await waitFor(() => expect(result.current.items).toHaveLength(10));
    lengths.length = 0;

    result.current.getNext(); // slides skip 0 -> 5, evicting the newest 5 -- the undershoot path
    await waitFor(() => {
      expect(result.current.items).toHaveLength(10);
      expect(result.current.atHead).toBe(false);
    });

    expect(Math.min(...lengths)).toBe(10);
  });

  test('getPrevious slides the window back toward the head after it has advanced', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 30);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(5);
    const { result } = renderHook(() => usePagination(db, query, { maxWindowSize: 10 }));

    await waitFor(() => expect(result.current.items).toHaveLength(5));

    result.current.getNext(); // limit -> 10 (within maxWindowSize)
    await waitFor(() => expect(result.current.items).toHaveLength(10));

    result.current.getNext(); // exceeds maxWindowSize -> slides forward (skip: 0 -> 5)
    await waitFor(() => {
      expect(result.current.atHead).toBe(false);
      expect(result.current.items.map((person) => person.name)).toEqual([
        'person-24',
        'person-23',
        'person-22',
        'person-21',
        'person-20',
        'person-19',
        'person-18',
        'person-17',
        'person-16',
        'person-15',
      ]);
    });

    // getPrevious is the inverse of the slide above: it should land exactly back on the head.
    result.current.getPrevious();
    await waitFor(() => {
      expect(result.current.atHead).toBe(true);
      expect(result.current.items.map((person) => person.name)).toEqual([
        'person-29',
        'person-28',
        'person-27',
        'person-26',
        'person-25',
        'person-24',
        'person-23',
        'person-22',
        'person-21',
        'person-20',
      ]);
    });

    // Already at the head -- no-op.
    result.current.getPrevious();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.atHead).toBe(true);
    expect(result.current.items).toHaveLength(10);
  });

  test('items never regresses to empty across a getNext transition (no scroll-jump regression)', async () => {
    // Regression test for a bug where `usePagination` delegated to the generic `useQuery`
    // hook: every `getNext` produced a brand new query AST, and `useQuery`'s AST-keyed
    // subscription started that new query from an empty snapshot before its async load resolved
    // -- flashing `items` to `[]` on every page load, which collapsed the virtualizer and snapped
    // scroll position back to the top in the real app.
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 30);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(3);
    const lengths: number[] = [];
    const { result } = renderHook(() => {
      const paginated = usePagination(db, query);
      lengths.push(paginated.items.length);
      return paginated;
    });

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    lengths.length = 0;

    result.current.getNext();
    await waitFor(() => expect(result.current.items).toHaveLength(6));

    expect(lengths.every((length) => length > 0)).toBe(true);
  });

  test('reflects live appends while at the head', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 2);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(5);
    const { result } = renderHook(() => usePagination(db, query));

    await waitFor(() => {
      expect(result.current.items.map((person) => person.name)).toEqual(['person-1', 'person-0']);
    });

    await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'person-2' })]);

    await waitFor(() => {
      expect(result.current.items.map((person) => person.name)).toEqual(['person-2', 'person-1', 'person-0']);
    });
  });

  test('throws when the query does not carry a limit', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc'));
    expect(() => renderHook(() => usePagination(db, query))).toThrow(/\.limit\(pageSize\)/);
  });

  test('throws when the query already carries a skip', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));

    const query = Query.select(Filter.type(TestSchema.Person))
      .from(feed)
      .orderBy(Order.natural('desc'))
      .skip(5)
      .limit(5);
    expect(() => renderHook(() => usePagination(db, query))).toThrow(/manages \.skip\(\)/);
  });
});
