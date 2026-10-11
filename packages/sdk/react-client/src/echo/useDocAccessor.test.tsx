//
// Copyright 2026 DXOS.org
//

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Filter, Obj, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { TestSchema } from '@dxos/echo/testing';

import { useDocAccessor } from './useDocAccessor.ts';

describe('useDocAccessor', () => {
  test('waits for the document of an object backed by the index', async () => {
    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });
    const { peer, db: initialDb } = await builder.createDatabase();
    initialDb.add(Obj.make(TestSchema.Expando, { value: 1 }));
    await initialDb.flush({ secondaryIndexes: true });
    await peer.reload();
    const db = await peer.openLastDatabase();

    const [object] = await db.query(Query.select(Filter.type(TestSchema.Expando)).options({ lazy: true })).run();
    expect(Doc.isLoaded(object)).toBe(false);

    const { result } = renderHook(() => useDocAccessor(object, ['value']));
    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBeDefined());
    expect(Doc.getValue(result.current!)).toBe(1);
  });

  test('holds the document while mounted, so eviction does not release it under the accessor', async () => {
    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });
    const { peer, db: initialDb } = await builder.createDatabase();
    initialDb.add(Obj.make(TestSchema.Expando, { value: 1 }));
    await initialDb.flush({ secondaryIndexes: true });
    await peer.reload();
    const db = await peer.openLastDatabase({ eviction: { idleMs: 0, intervalMs: 20 } });

    const [object] = await db.query(Query.select(Filter.type(TestSchema.Expando)).options({ lazy: true })).run();
    const { result, unmount } = renderHook(() => useDocAccessor(object, ['value']));
    await waitFor(() => expect(result.current).toBeDefined());
    await sleep(300);
    expect(Doc.isLoaded(object)).toBe(true);

    unmount();
    await waitFor(() => expect(Doc.isLoaded(object)).toBe(false));
  });

  test('returns the accessor at once for an object whose document is loaded', async () => {
    const object = Obj.make(TestSchema.Expando, { value: 1 });
    const { result } = renderHook(() => useDocAccessor(object, ['value']));
    expect(Doc.getValue(result.current!)).toBe(1);
  });
});
