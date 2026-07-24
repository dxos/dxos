//
// Copyright 2026 DXOS.org
//

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Aggregate, Database, Feed, Filter, Obj, Order, Query } from '@dxos/echo';
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
    // Advancing `skip` (e.g. `{skip:0,limit:10}` -> `{skip:5,limit:10}`) must never render fewer
    // than `limit` items in between: the new range's query result can only overwrite the previous
    // range's once it has actually resolved, otherwise the virtualizer sees a transient shrink.
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
    // Every `getNext` produces a brand new query AST (a new skip/limit); `items` must keep showing
    // the previous range's results until the new range's first real result arrives, since a flash
    // to `[]` on every page load collapses the virtualizer and snaps scroll position to the top.
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

  test('holds the previous page across a query-identity change instead of blanking', async () => {
    // Regression test for the mailbox "flash to loading during sync" bug. The Inbox/Sent view
    // selects by an explicit id set (`Filter.id(...ids)`); each message tagged mid-sync grows that
    // set, which is a new query identity and rebuilds the internal store. The rebuilt store must
    // seed from the page already on screen -- keeping it visible with `isLoading` false -- rather
    // than resetting to empty + loading and blanking the whole list on every sync batch.
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'tagged' }));
    await appendPeople(feed, db, 5);

    // Resolve the feed's object ids (newest-first) to build a growing id-set filter, as the mailbox
    // system-tag view does from its `TagIndex`.
    const all = await db
      .query(Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')))
      .run();
    const ids = all.map((person) => person.id);

    const queryFor = (selected: string[]) =>
      Query.select(Filter.and(Filter.type(TestSchema.Person), Filter.id(...selected)))
        .from(feed)
        .orderBy(Order.natural('desc'))
        .limit(10);

    const { result, rerender } = renderHook(({ query }) => usePagination(db, query), {
      initialProps: { query: queryFor(ids.slice(0, 3)) },
    });

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.isLoading).toBe(false);

    // A new message gets tagged: the id set grows -> new query identity -> internal store rebuild.
    rerender({ query: queryFor(ids.slice(0, 5)) });

    // The previously-shown page stays on screen (never empties) and no loading state is surfaced for
    // this background refresh -- the whole point of the fix. (Pre-fix: items [] and isLoading true.)
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.isLoading).toBe(false);

    await waitFor(() => expect(result.current.items).toHaveLength(5));
  });

  test('pages over whole groups for a grouped query', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'grouped' }));
    // 8 people over 4 emails, appended round-robin so group members interleave in the stream.
    for (let i = 0; i < 8; i++) {
      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Person, { name: `person-${i}`, email: `group-${i % 4}@example.com` }),
      ]);
    }

    const query = Query.select(Filter.type(TestSchema.Person))
      .from(feed)
      .orderBy(Order.natural('desc'))
      .aggregate({ email: Aggregate.group('email'), items: Aggregate.items() })
      .limit(2);
    const { result } = renderHook(() => usePagination(db, query));

    // Groups are ordered by first occurrence in the newest-first stream; the page size counts
    // groups, not rows.
    await waitFor(() => {
      expect(result.current.items.map((group) => group.email)).toEqual(['group-3@example.com', 'group-2@example.com']);
    });
    expect(result.current.items.map((group) => group.items.map((person) => person.name))).toEqual([
      ['person-7', 'person-3'],
      ['person-6', 'person-2'],
    ]);
    expect(result.current.hasMore).toBe(true);

    result.current.getNext();

    await waitFor(() => {
      expect(result.current.items.map((group) => group.email)).toEqual([
        'group-3@example.com',
        'group-2@example.com',
        'group-1@example.com',
        'group-0@example.com',
      ]);
    });
    expect(result.current.items.map((group) => group.items.map((person) => person.name))).toEqual([
      ['person-7', 'person-3'],
      ['person-6', 'person-2'],
      ['person-5', 'person-1'],
      ['person-4', 'person-0'],
    ]);
  });

  test('pages over whole groups produced by a subquery semi-join (Filter.in(query.project(...)))', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'semi-join' }));

    // Three "threads" by title; only threads with an explicitly completed member qualify.
    await db.appendToFeed(feed, [
      Obj.make(TestSchema.Task, { title: 'a', completed: true }),
      Obj.make(TestSchema.Task, { title: 'a', completed: false }),
      Obj.make(TestSchema.Task, { title: 'b', completed: true }),
      Obj.make(TestSchema.Task, { title: 'b', completed: false }),
      Obj.make(TestSchema.Task, { title: 'c', completed: false }), // no qualifying member — excluded
    ]);

    const matches = Query.select(Filter.type(TestSchema.Task, { completed: true })).from(feed);
    const source = Query.select(Filter.type(TestSchema.Task, { title: Filter.in(matches.project('title')) }))
      .from(feed)
      .orderBy(Order.natural('asc'))
      .aggregate({ title: Aggregate.group('title'), items: Aggregate.items() })
      .limit(1);
    const { result } = renderHook(() => usePagination(db, source));

    // First page: one whole qualifying thread (both members), not a partial row slice.
    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });
    expect(result.current.items[0].items).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);

    result.current.getNext();

    // Second page reveals the other qualifying thread; the non-qualifying thread 'c' never appears.
    await waitFor(() => {
      expect(result.current.items.map((group) => group.title).sort()).toEqual(['a', 'b']);
    });
    expect(result.current.items.every((group) => group.items.length === 2)).toBe(true);
    expect(result.current.items.some((group) => group.title === 'c')).toBe(false);
  });

  test('orders and pages groups by a max aggregate in both directions', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'aggregated' }));
    // Two members per email; each group's max(name) is the recency proxy. Appended so that neither
    // feed order nor first-occurrence matches aggregate order — only max(name) ordering does.
    const emailByName: Record<string, string> = {
      p0: 'd@x',
      p1: 'a@x',
      p2: 'b@x',
      p3: 'c@x',
      p4: 'd@x',
      p5: 'c@x',
      p6: 'b@x',
      p7: 'a@x',
    };
    for (const name of ['p3', 'p0', 'p6', 'p1', 'p4', 'p7', 'p2', 'p5']) {
      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name, username: name, email: emailByName[name] })]);
    }

    // Members newest-first (name desc) within each thread; threads ordered by their max(name).
    const grouped = Query.select(Filter.type(TestSchema.Person))
      .from(feed)
      .orderBy(Order.property('name', 'desc'))
      .aggregate({ email: Aggregate.group('email'), latest: Aggregate.max('name'), items: Aggregate.items() });

    const descending = renderHook(() => usePagination(db, grouped.orderBy(Order.property('latest', 'desc')).limit(2)));
    // First page: the two groups with the highest max(name) — a@x (p7) then b@x (p6).
    await waitFor(() => {
      expect(descending.result.current.items.map((group) => group.email)).toEqual(['a@x', 'b@x']);
    });
    expect(descending.result.current.items.map((group) => group.latest)).toEqual(['p7', 'p6']);
    expect(descending.result.current.items.map((group) => group.items.map((person) => person.name))).toEqual([
      ['p7', 'p1'],
      ['p6', 'p2'],
    ]);

    descending.result.current.getNext();
    await waitFor(() => {
      expect(descending.result.current.items.map((group) => group.email)).toEqual(['a@x', 'b@x', 'c@x', 'd@x']);
    });

    // Ascending flips the thread order by latest message (not by oldest); members stay newest-first.
    const ascending = renderHook(() => usePagination(db, grouped.orderBy(Order.property('latest', 'asc')).limit(2)));
    await waitFor(() => {
      expect(ascending.result.current.items.map((group) => group.email)).toEqual(['d@x', 'c@x']);
    });
    expect(ascending.result.current.items.map((group) => group.items.map((person) => person.name))).toEqual([
      ['p4', 'p0'],
      ['p5', 'p3'],
    ]);
  });

  test('isLoading is true while the first page loads, then false once it settles', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 5);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(3);
    const loadingStates: boolean[] = [];
    const { result } = renderHook(() => {
      const paginated = usePagination(db, query);
      loadingStates.push(paginated.isLoading);
      return paginated;
    });

    // The async feed query is in flight from the first render until its first result lands.
    expect(loadingStates[0]).toBe(true);
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.isLoading).toBe(false);
  });

  test('isLoading settles to false for an empty feed (never sticks)', async () => {
    // An empty async feed still delivers a first response, so isLoading must clear on it.
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'empty' }));

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(3);
    const { result } = renderHook(() => usePagination(db, query));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(0);
  });

  test('isLoading goes true again while getNext loads the next page', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'windowed' }));
    await appendPeople(feed, db, 10);

    const query = Query.select(Filter.type(TestSchema.Person)).from(feed).orderBy(Order.natural('desc')).limit(3);
    const loadingStates: boolean[] = [];
    const { result } = renderHook(() => {
      const paginated = usePagination(db, query);
      loadingStates.push(paginated.isLoading);
      return paginated;
    });

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.isLoading).toBe(false);

    loadingStates.length = 0;
    result.current.getNext();
    await waitFor(() => expect(result.current.items).toHaveLength(6));

    // The next range was in flight between the request and its delivery, then settled.
    expect(loadingStates.some((loading) => loading)).toBe(true);
    expect(result.current.isLoading).toBe(false);
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
