//
// Copyright 2026 DXOS.org
//

import { type Virtualizer } from '@tanstack/react-virtual';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { type VirtualizerPaginationController, useVirtualizerPagination } from './useVirtualizerPagination';

type Item = { id: string };

const getId = (item: Item) => item.id;
const makeItems = (ids: number[]): Item[] => ids.map((id) => ({ id: String(id) }));

const ROW_HEIGHT = 60;
const VIEWPORT_HEIGHT = 340;

/**
 * Minimal fake covering only the fields the hook actually reads off a real `Virtualizer` -- a
 * genuine type-boundary mock; there's no typed alternative short of driving real DOM layout.
 */
const makeVirtualizer = (itemCount: number, lastVisibleIndex: number): Virtualizer<any, any> =>
  ({
    getVirtualItems: () => [{ index: lastVisibleIndex }],
    measurementsCache: Array.from({ length: itemCount }, (_, i) => ({
      start: i * ROW_HEIGHT,
      end: i * ROW_HEIGHT + (ROW_HEIGHT - 4),
    })),
    scrollOffset: lastVisibleIndex * ROW_HEIGHT,
    scrollElement: { clientHeight: VIEWPORT_HEIGHT },
    getTotalSize: () => itemCount * ROW_HEIGHT,
    scrollToOffset: vi.fn(),
  }) as unknown as Virtualizer<any, any>;

describe('useVirtualizerPagination', () => {
  test('chains getNext across a page landing with no further onChange', async () => {
    // Regression test: once the loaded window's tail is fully rendered and the scrollbar sits at
    // its physical max, `@tanstack/react-virtual` stops calling `onChange` -- its `maybeNotify` only
    // fires on `[isScrolling, startIndex, endIndex]` changes, and neither moves just because `items`
    // did. A `getNext` chain (e.g. a mailbox window sliding once it hits its max size, appending a
    // page while evicting an equal-sized one from the front) must keep going purely off the `items`
    // prop changing -- with no further onChange -- or it stalls forever right where it landed.
    let items = makeItems([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const getNext = vi.fn(() => {
      items = makeItems([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    });
    const pagination: VirtualizerPaginationController = { getNext, atHead: true };

    const { result, rerender } = renderHook(
      (props: { items: Item[] }) => useVirtualizerPagination({ items: props.items, getId, pagination }),
      { initialProps: { items } },
    );

    // The one onChange tanstack fires as the user scrolls to the loaded window's tail: near the
    // bottom edge, last row visible, and tall enough (10 rows) to exceed the viewport so the
    // hook's own `isScrollable` check passes.
    act(() => {
      result.current.onChange(makeVirtualizer(10, 9));
    });
    // `requestNext`'s own `getNext()` call is deferred to a microtask.
    await act(async () => {
      await Promise.resolve();
    });
    expect(getNext).toHaveBeenCalledTimes(1);

    // The data layer resolved and slid the window -- re-render with the new page, but WITHOUT any
    // further onChange call (tanstack wouldn't fire one: the rendered range hasn't moved).
    rerender({ items });
    await act(async () => {
      await Promise.resolve();
    });

    // The chain must continue on its own: the window is still the same size, so the same geometry
    // is still "near the bottom" -- the layout effect's re-arm should have requested another page.
    expect(getNext).toHaveBeenCalledTimes(2);
  });

  test('does not misclassify a mid-list item reordered to the head as an eviction', () => {
    // Regression test: a conversation-grouped mailbox bumps an existing (already-loaded) thread to
    // the head when a new reply lands during sync. A bare `findIndex` match on the new head's id
    // used to be enough to classify this as an 'evicted' prefix -- reading the bumped item's old
    // mid-list offset as "evicted" height and growing the leading spacer by a bogus amount that's
    // never reversed, which is what produced the flashing/jumping during sync.
    const items = makeItems([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const pagination: VirtualizerPaginationController = {};

    const { result, rerender } = renderHook(
      (props: { items: Item[] }) => useVirtualizerPagination({ items: props.items, getId, pagination }),
      { initialProps: { items } },
    );

    act(() => {
      result.current.onChange(makeVirtualizer(10, 4));
    });
    expect(result.current.leadingSpace).toBe(0);

    // Item '5' (previously mid-list, at index 5) is bumped to the head; everything else keeps its
    // prior relative order -- exactly the shape a conversation re-sort produces.
    const reordered = [items[5], ...items.slice(0, 5), ...items.slice(6)];
    rerender({ items: reordered });

    expect(result.current.leadingSpace).toBe(0);
  });
});
