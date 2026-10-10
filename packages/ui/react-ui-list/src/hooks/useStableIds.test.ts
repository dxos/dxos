//
// Copyright 2026 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { describe, test } from 'vitest';

import { useStableIds } from './useStableIds.ts';

type Range = { range: string };

const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);

describe('useStableIds', () => {
  test('ids follow their values through move, remove and insert', ({ expect }) => {
    let values: Range[] = [{ range: 'A1' }, { range: 'B2' }, { range: 'C3' }];
    const { result, rerender } = renderHook(() => useStableIds(values));
    const [a, b, c] = ids(result.current.items);
    expect(new Set([a, b, c]).size).toBe(3);

    act(() => {
      values = result.current.move(0, 2);
    });
    rerender();
    expect(ids(result.current.items)).toEqual([b, c, a]);
    expect(result.current.items.map((item) => item.value.range)).toEqual(['B2', 'C3', 'A1']);

    act(() => {
      values = result.current.remove(1);
    });
    rerender();
    expect(ids(result.current.items)).toEqual([b, a]);

    act(() => {
      values = result.current.insert(1, { range: 'D4' });
    });
    rerender();
    const [first, inserted, last] = ids(result.current.items);
    expect([first, last]).toEqual([b, a]);
    expect([a, b, c]).not.toContain(inserted);
  });

  test('a persisted copy of an edit keeps the edited ids', ({ expect }) => {
    let values: Range[] = [{ range: 'A1' }, { range: 'B2' }];
    const { result, rerender } = renderHook(() => useStableIds(values));
    const [a, b] = ids(result.current.items);
    act(() => {
      // The store hands back structured copies, not the returned elements.
      values = result.current.move(1, 0).map((value) => ({ ...value }));
    });
    rerender();
    expect(ids(result.current.items)).toEqual([b, a]);
  });

  test('an outside change keeps ids by position', ({ expect }) => {
    let values: Range[] = [{ range: 'A1' }, { range: 'B2' }];
    const { result, rerender } = renderHook(() => useStableIds(values));
    const [a, b] = ids(result.current.items);
    values = [...values, { range: 'C3' }];
    rerender();
    const next = ids(result.current.items);
    expect(next.slice(0, 2)).toEqual([a, b]);
    expect(next[2]).toBeDefined();
    expect(result.current.getId(result.current.items[0])).toBe(a);
  });
});
