//
// Copyright 2026 DXOS.org
//

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Aggregate, Filter, GroupKey, Obj, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { useQuery } from './useQuery';

describe('useQuery', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('returns entities for a plain query', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Person] });
    const db = await peer.createDatabase();

    db.add(Obj.make(TestSchema.Person, { name: 'Alice', username: 'alice', email: 'alice@example.com', tasks: [] }));
    await db.flush();

    const { result } = renderHook(() => useQuery(db, Query.select(Filter.type(TestSchema.Person))));

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });
    expect(result.current[0].name).toBe('Alice');
  });

  test('returns grouped results for a groupBy query', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db = await peer.createDatabase();

    db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
    db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
    db.add(Obj.make(TestSchema.Expando, { category: 'b' }));
    await db.flush();

    const query = Query.select(Filter.everything())
      .groupBy(GroupKey.property('category'))
      .aggregate({ count: Aggregate.count(), items: Aggregate.items() });
    const { result } = renderHook(() => useQuery(db, query));

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
    });

    const byKey = new Map(result.current.map((group: any) => [group.key.category, group]));
    expect(byKey.get('a')?.count).toBe(2);
    expect(byKey.get('a')?.items).toHaveLength(2);
    expect(byKey.get('b')?.count).toBe(1);
  });

  test('groups update reactively as objects are added', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db = await peer.createDatabase();

    db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
    await db.flush();

    const query = Query.select(Filter.everything()).groupBy(GroupKey.property('category'));
    const { result } = renderHook(() => useQuery(db, query));

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    db.add(Obj.make(TestSchema.Expando, { category: 'b' }));
    await db.flush({ updates: true });

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
    });
  });

  test('stable snapshot identity when nothing changes', async () => {
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db = await peer.createDatabase();

    db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
    await db.flush();

    const query = Query.select(Filter.everything()).groupBy(GroupKey.property('category'));
    const { result, rerender } = renderHook(() => useQuery(db, query));

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
