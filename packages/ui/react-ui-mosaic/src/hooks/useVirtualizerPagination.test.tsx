//
// Copyright 2026 DXOS.org
//

import { type Virtualizer } from '@tanstack/react-virtual';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { type VirtualizerPaginationController, useVirtualizerPagination } from './useVirtualizerPagination.ts';

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

/** A window shorter than the viewport, sitting unscrolled at the top (offset 0, all rows rendered). */
const makeUnscrolledVirtualizer = (itemCount: number): Virtualizer<any, any> =>
  ({
    getVirtualItems: () => Array.from({ length: itemCount }, (_, index) => ({ index })),
    measurementsCache: Array.from({ length: itemCount }, (_, index) => ({
      start: index * ROW_HEIGHT,
      end: index * ROW_HEIGHT + (ROW_HEIGHT - 4),
    })),
    scrollOffset: 0,
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

  test('extends an underfilled window that cannot be scrolled', async () => {
    // The mailbox regression: a first page whose rows happen to fit the viewport exactly is not
    // scrollable, so the user can never produce the scroll offset the edge triggers waited for and
    // the list showed one page forever. An underfilled window must extend on its own.
    let items = makeItems([0, 1, 2]);
    const getNext = vi.fn(() => {
      items = makeItems([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
    const pagination: VirtualizerPaginationController = { getNext, atHead: true };

    const { result } = renderHook(
      (props: { items: Item[] }) => useVirtualizerPagination({ items: props.items, getId, pagination }),
      { initialProps: { items } },
    );

    // Three rows at the top of an unscrolled viewport: nothing to scroll (3 * 60 < 340), offset 0.
    act(() => {
      result.current.onChange(makeUnscrolledVirtualizer(3));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(getNext).toHaveBeenCalledTimes(1);
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

  test('does not read a filter that keeps a contiguous run of rows as an eviction', () => {
    // Filtering a mailbox by a tag can leave rows that were already contiguous in the old list
    // (e.g. rows 2 and 3 of 8). Positionally that is indistinguishable from a window that slid past
    // its first two rows -- but a window anchored at the live head has evicted nothing, so reading
    // it as a slide grew the spacer by the dropped rows' height and left blank space above the list.
    const items = makeItems([0, 1, 2, 3, 4, 5, 6, 7]);
    const pagination: VirtualizerPaginationController = { atHead: true };

    const { result, rerender } = renderHook(
      (props: { items: Item[] }) => useVirtualizerPagination({ items: props.items, getId, pagination }),
      { initialProps: { items } },
    );

    act(() => {
      result.current.onChange(makeUnscrolledVirtualizer(8));
    });
    rerender({ items: items.slice(2, 4) });

    expect(result.current.leadingSpace).toBe(0);
  });

  test('stays at the top when rows arrive above an unscrolled window at the head', () => {
    // Clearing a filter restores rows above the ones already shown. The reader was at the top of the
    // live head, so the restored rows belong in view -- scrolling to keep the old first row in place
    // would hide them above the viewport.
    const items = makeItems([0, 1, 2, 3, 4, 5, 6, 7]);
    const pagination: VirtualizerPaginationController = { atHead: true };

    const { result, rerender } = renderHook(
      (props: { items: Item[] }) => useVirtualizerPagination({ items: props.items, getId, pagination }),
      { initialProps: { items: items.slice(2, 4) } },
    );

    const virtualizer = makeUnscrolledVirtualizer(2);
    act(() => {
      result.current.onChange(virtualizer);
    });
    // The incoming render measures all eight rows, uniform height, before the layout effect runs.
    virtualizer.measurementsCache = makeUnscrolledVirtualizer(8).measurementsCache;
    rerender({ items });

    expect(virtualizer.scrollToOffset).not.toHaveBeenCalled();
    expect(result.current.leadingSpace).toBe(0);
  });
});
