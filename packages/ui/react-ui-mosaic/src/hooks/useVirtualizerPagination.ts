//
// Copyright 2026 DXOS.org
//

import { type Virtualizer } from '@tanstack/react-virtual';
import { useCallback, useLayoutEffect, useRef } from 'react';

import { type GetId } from '../components';

/** Number of virtual rows from either loaded edge at which the next/previous page is requested. */
const DEFAULT_THRESHOLD = 12;

export type VirtualizerPaginationController = {
  /** Requests the next (e.g. older) page. Omit to disable the bottom-edge trigger. */
  loadNext?: () => void;
  /** Requests the previous (e.g. newer) page. Omit to disable the top-edge trigger. */
  loadPrevious?: () => void;
};

export type UseVirtualizerPaginationProps<TItem = any> = {
  /** Currently loaded window, in the order rendered by the virtualizer. */
  items: readonly TItem[] | TItem[] | undefined;

  /** ID getter, aligned with the virtualizer's own `getId`/`getItemKey`. */
  getId: GetId<TItem>;

  /** Load-next/load-previous callbacks. Both edges are inert while omitted. */
  pagination?: VirtualizerPaginationController;

  /** Rows from either loaded edge at which the adjacent page is requested. @default 12 */
  threshold?: number;
};

/**
 * Wires a paginated data source into a `Mosaic.VirtualStack`: requests the next/previous page
 * once the visible range approaches either loaded edge, and preserves scroll position across the
 * resulting `items` change.
 *
 * `@tanstack/react-virtual` keys items by stable id (measured sizes survive reordering), but it
 * recomputes every item's *pixel offset* from the current array order on each render, with no
 * built-in compensation for insertion/removal at the front -- so evicting the newest items or
 * prepending newer ones otherwise shifts all content under a scroll offset that itself never
 * moves, reading as a jump/flicker. This hook anchors on whichever item was first-visible just
 * before `items` changed and restores it to the same on-screen offset afterward.
 *
 * Pass the returned `onChange` to `Mosaic.VirtualStack`'s `onChange` prop.
 */
export const useVirtualizerPagination = <TItem = any>({
  items,
  getId,
  pagination,
  threshold = DEFAULT_THRESHOLD,
}: UseVirtualizerPaginationProps<TItem>): { onChange: (virtualizer: Virtualizer<any, any>) => void } => {
  const itemCount = items?.length ?? 0;

  // Tracks the live virtualizer instance (for imperative `scrollToOffset` calls) and the
  // identity/on-screen offset of whichever item was first-visible just before `items` last
  // changed.
  const virtualizerRef = useRef<Virtualizer<any, any> | null>(null);
  const anchorRef = useRef<{ id: string; offsetFromTop: number } | null>(null);
  const prevItemsRef = useRef(items);

  // Snapshot the anchor the moment `items` is about to change, during render rather than inside
  // `onChange` or an effect. `@tanstack/react-virtual` calls `onChange` synchronously as part of
  // consuming an updated `count`/`items` option on *every* render (`setOptions` runs
  // unconditionally in the render body, not an effect) -- so by the time `onChange` fires for this
  // render, it already sees the NEW `items`, making "first visible item in `items`"
  // self-referential and the compensation below a permanent no-op. Right here, before the caller's
  // `Mosaic.VirtualStack` has re-rendered with the new array, `virtualizerRef.current` still
  // reflects the outgoing array's measurements/scroll offset, so indexing into
  // `prevItemsRef.current` (the outgoing array) with it is accurate.
  if (prevItemsRef.current !== items) {
    const virtualizer = virtualizerRef.current;
    const firstVisible = virtualizer?.getVirtualItems().at(0);
    if (virtualizer && firstVisible) {
      const anchorItem = prevItemsRef.current?.[firstVisible.index];
      const anchorId = anchorItem && getId(anchorItem);
      if (anchorId) {
        anchorRef.current = { id: anchorId, offsetFromTop: firstVisible.start - (virtualizer.scrollOffset ?? 0) };
      }
    }
    prevItemsRef.current = items;
  }

  const onChange = useCallback(
    (virtualizer: Virtualizer<any, any>) => {
      virtualizerRef.current = virtualizer;
      const virtualItems = virtualizer.getVirtualItems();
      const firstVisible = virtualItems.at(0);
      const lastVisible = virtualItems.at(-1);
      if (pagination?.loadNext && lastVisible && lastVisible.index >= itemCount - threshold) {
        pagination.loadNext();
      }
      if (pagination?.loadPrevious && firstVisible && firstVisible.index < threshold) {
        pagination.loadPrevious();
      }
    },
    [pagination, itemCount, threshold],
  );

  // Restores the previously-first-visible item to the same on-screen offset it had before `items`
  // changed. A no-op when the anchor item's index hasn't moved (e.g. appending at the end).
  useLayoutEffect(() => {
    const virtualizer = virtualizerRef.current;
    const anchor = anchorRef.current;
    if (!virtualizer || !anchor || !items) {
      return;
    }
    const newIndex = items.findIndex((item) => getId(item) === anchor.id);
    if (newIndex < 0) {
      return;
    }
    const offset = virtualizer.getOffsetForIndex(newIndex, 'start');
    if (!offset) {
      return;
    }
    const target = offset[0] - anchor.offsetFromTop;
    if (target !== virtualizer.scrollOffset) {
      virtualizer.scrollToOffset(target, { align: 'start' });
    }
  }, [items, getId]);

  return { onChange };
};
