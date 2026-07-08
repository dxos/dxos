//
// Copyright 2026 DXOS.org
//

import { type Virtualizer } from '@tanstack/react-virtual';
import { type MutableRefObject, useCallback, useLayoutEffect, useRef, useState } from 'react';

import { type GetId } from '../components';

/** Rows from either loaded edge at which the next/previous page is requested. */
const DEFAULT_THRESHOLD = 12;

/** Index at/above which `getNext` fires; small windows clamp to the last row only. */
const nextPageIndexThreshold = (itemCount: number, threshold: number): number =>
  itemCount > threshold ? itemCount - threshold : itemCount - 1;

/** True when loaded content exceeds the scroll viewport (user can actually scroll). */
const isScrollable = (virtualizer: Virtualizer<any, any>): boolean => {
  const viewportHeight = virtualizer.scrollElement?.clientHeight ?? 0;
  return viewportHeight > 0 && virtualizer.getTotalSize() > viewportHeight + 1;
};

export type VirtualizerPaginationController = {
  /** Requests the next (e.g. older) page. Omit to disable the bottom-edge trigger. */
  getNext?: () => void;
  /** Requests the previous (e.g. newer) page. Omit to disable the top-edge trigger. */
  getPrevious?: () => void;
  /** When true, suppresses the top-edge trigger (window is anchored at the live head). */
  atHead?: boolean;
  /** When true, suppresses both edge triggers while a page is in flight. */
  isLoading?: boolean;
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

export type UseVirtualizerPaginationResult = {
  onChange: (virtualizer: Virtualizer<any, any>) => void;
  /** Extra scrollable space (px) to feed into the virtualizer's `paddingStart`. */
  leadingSpace: number;
};

/** A retained item's identity and pre-change offset. */
type Anchor = { id: string; start: number };

/** Per-direction dedup/throttle state for `evaluateTriggers`, independent of item type. */
type TriggerState = {
  lastNextRequestedItems: MutableRefObject<unknown>;
  lastPreviousRequestedItems: MutableRefObject<unknown>;
  lastGetNextScroll: MutableRefObject<number | null>;
  lastGetPreviousScroll: MutableRefObject<number | null>;
  pagination: MutableRefObject<VirtualizerPaginationController | undefined>;
};

type EvaluateTriggersOptions = {
  virtualizer: Virtualizer<any, any>;
  items: unknown;
  pagination: VirtualizerPaginationController | undefined;
  itemCount: number;
  threshold: number;
  state: TriggerState;
};

/**
 * Requests `getNext`/`getPrevious` once the loaded window's edge (by row index, not scroll
 * position -- the spacer makes blank space scrollable too) nears the viewport. Deduped per
 * direction and per `items` snapshot; re-armed while the viewport sits in blank space so a chain
 * of pages loads back-to-back without further user scrolling.
 */
const evaluateTriggers = ({ virtualizer, items, pagination, itemCount, threshold, state }: EvaluateTriggersOptions) => {
  const scrollable = isScrollable(virtualizer);
  const scrollOffset = virtualizer.scrollOffset ?? 0;
  const viewportHeight = virtualizer.scrollElement?.clientHeight ?? 0;
  const virtualItems = virtualizer.getVirtualItems();
  const firstVisible = virtualItems.at(0);
  const lastVisible = virtualItems.at(-1);
  // `measurementsCache` covers the whole array even when nothing is rendered (deep in the spacer).
  const measurements = virtualizer.measurementsCache;
  const firstItemStart = measurements[0]?.start;
  const lastItemEnd = measurements.at(-1)?.end;
  const nextThreshold = nextPageIndexThreshold(itemCount, threshold);
  const smallWindow = itemCount <= threshold;
  const nearBottomIndex = lastVisible
    ? lastVisible.index >= nextThreshold
    : !!(lastItemEnd != null && scrollOffset + viewportHeight > lastItemEnd);
  const nearTopIndex = firstVisible
    ? firstVisible.index < threshold
    : !!(firstItemStart != null && scrollOffset < firstItemStart);
  const blankAbove = !!(firstItemStart != null && firstItemStart > scrollOffset);
  const blankBelow = !!(lastItemEnd != null && lastItemEnd < scrollOffset + viewportHeight);
  const canGetNext =
    state.lastGetNextScroll.current === null || scrollOffset !== state.lastGetNextScroll.current || blankBelow;
  const canGetPrevious =
    state.lastGetPreviousScroll.current === null || scrollOffset !== state.lastGetPreviousScroll.current || blankAbove;
  const triggerNext = !!(
    pagination?.getNext &&
    !pagination.isLoading &&
    scrollable &&
    nearBottomIndex &&
    canGetNext &&
    (!smallWindow || scrollOffset > 0)
  );
  const triggerPrev = !!(
    pagination?.getPrevious &&
    !pagination.isLoading &&
    scrollable &&
    canGetPrevious &&
    nearTopIndex &&
    pagination.atHead !== true
  );
  if (!nearBottomIndex) {
    state.lastGetNextScroll.current = null;
  }
  if (!nearTopIndex) {
    state.lastGetPreviousScroll.current = null;
  }
  if (!triggerNext) {
    state.lastNextRequestedItems.current = undefined;
  }
  if (!triggerPrev) {
    state.lastPreviousRequestedItems.current = undefined;
  }
  if (triggerNext && state.lastNextRequestedItems.current !== items) {
    state.lastNextRequestedItems.current = items;
    state.lastGetNextScroll.current = scrollOffset;
    const getNext = state.pagination.current?.getNext;
    queueMicrotask(() => getNext?.());
  } else if (triggerPrev && state.lastPreviousRequestedItems.current !== items) {
    state.lastPreviousRequestedItems.current = items;
    state.lastGetPreviousScroll.current = scrollOffset;
    const getPrevious = state.pagination.current?.getPrevious;
    queueMicrotask(() => getPrevious?.());
  }
};

/** Total height (px) of `prevItems[0, oldIndexOfNewFirst)`, per its outgoing measurements. */
const evictedPrefixHeight = (virtualizer: Virtualizer<any, any>, oldIndexOfNewFirst: number): number => {
  const measurements = virtualizer.measurementsCache;
  return (measurements[oldIndexOfNewFirst]?.start ?? 0) - (measurements[0]?.start ?? 0);
};

/**
 * Finds an item retained across a prepend, anchored on its pre-change offset. Scans from the tail
 * (the common case -- a prepend leaves the rest of the window untouched) and doesn't require the
 * item to be currently rendered, since `measurementsCache` covers the whole array.
 */
const findRetainedAnchor = <TItem>(
  prevItems: readonly TItem[],
  newIds: Set<unknown>,
  getId: GetId<TItem>,
  virtualizer: Virtualizer<any, any>,
): Anchor | null => {
  for (let index = prevItems.length - 1; index >= 0; index--) {
    const id = getId(prevItems[index]);
    if (newIds.has(id)) {
      const start = virtualizer.measurementsCache[index]?.start;
      return start != null ? { id, start } : null;
    }
  }
  return null;
};

/**
 * Wires a paginated data source into a `Mosaic.VirtualStack`: requests the next/previous page near
 * either loaded edge (`evaluateTriggers`), and keeps the scrollbar stable across the resulting
 * `items` change by maintaining a leading spacer instead of rewriting the scroll offset.
 *
 * Called internally by `Mosaic.VirtualStack` when its `pagination` prop is set -- not normally
 * called directly.
 *
 * `@tanstack/react-virtual` recomputes every item's pixel offset from the current array on each
 * render, with no compensation for insertion/removal at the front -- rewriting the scroll offset
 * to chase that shift visibly jumps the scrollbar thumb. Instead, `leadingSpace` (fed back into
 * `paddingStart`) grows by exactly the evicted height and shrinks by exactly the prepended height,
 * so retained items keep their absolute position and the thumb only scales as the total grows.
 *
 * Eviction is corrected synchronously during the same render that observes the new `items`, since
 * the evicted height is already known from the outgoing window's own measurements -- deferring it
 * would let the browser observe (and clamp `scrollTop` against) a momentary, too-short frame.
 * Prepending is corrected one render later, from a layout effect, since the prepended items'
 * heights aren't known until the incoming render measures them; that lag is safe because
 * prepending only ever grows content before the spacer shrinks to match.
 *
 * The layout effect also re-runs `evaluateTriggers`, because `@tanstack/react-virtual` only calls
 * `onChange` when the visible range changes, not merely when `items` does -- while the viewport
 * sits in blank spacer space the range never changes, so relying on `onChange` alone would stall a
 * catch-up chain after one page.
 *
 * Assumes the stack renders with `draggable={false}` (virtual indices map 1:1 onto `items`).
 */
export const useVirtualizerPagination = <TItem = any>({
  items,
  getId,
  pagination,
  threshold = DEFAULT_THRESHOLD,
}: UseVirtualizerPaginationProps<TItem>): UseVirtualizerPaginationResult => {
  const itemCount = items?.length ?? 0;

  const [leadingSpace, setLeadingSpace] = useState(0);
  const leadingSpaceRef = useRef(leadingSpace);

  const virtualizerRef = useRef<Virtualizer<any, any> | null>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const prevItemsRef = useRef(items);
  // Suppresses trigger evaluation for the scroll event that our own correction below causes.
  const restoringRef = useRef(false);

  const triggerState: TriggerState = {
    lastNextRequestedItems: useRef<unknown>(undefined),
    lastPreviousRequestedItems: useRef<unknown>(undefined),
    lastGetNextScroll: useRef<number | null>(null),
    lastGetPreviousScroll: useRef<number | null>(null),
    pagination: useRef(pagination),
  };
  triggerState.pagination.current = pagination;

  // Snapshots the front-edge change during render, before `Mosaic.VirtualStack` re-renders with
  // the new `items` -- at this point `virtualizerRef.current` still reflects the outgoing array.
  // The spacer/anchor computation itself is gated on `pagination` so a caller not using pagination
  // never gets it for an unrelated `items` change (e.g. a sort or filter); `prevItemsRef` still
  // tracks every change unconditionally so it isn't stale if `pagination` is attached later.
  if (prevItemsRef.current !== items) {
    const virtualizer = virtualizerRef.current;
    const prevItems = prevItemsRef.current;
    if (pagination) {
      const firstNewId = items?.[0] != null ? getId(items[0]) : undefined;
      const oldIndexOfNewFirst =
        firstNewId != null ? (prevItems?.findIndex((item) => getId(item) === firstNewId) ?? -1) : -1;
      if (virtualizer && oldIndexOfNewFirst >= 0) {
        // Prefix eviction or pure append: correct now (see doc comment above).
        const nextSpace = leadingSpaceRef.current + evictedPrefixHeight(virtualizer, oldIndexOfNewFirst);
        if (nextSpace !== leadingSpaceRef.current) {
          leadingSpaceRef.current = nextSpace;
          setLeadingSpace(nextSpace);
        }
        anchorRef.current = null;
      } else if (virtualizer && prevItems) {
        // Prepend or a reset to a disjoint range: defer to the layout effect below.
        const newIds = new Set(items?.map((item) => getId(item)));
        anchorRef.current = findRetainedAnchor(prevItems, newIds, getId, virtualizer);
      }
    }
    prevItemsRef.current = items;
  }

  const onChange = useCallback(
    (virtualizer: Virtualizer<any, any>) => {
      virtualizerRef.current = virtualizer;
      if (restoringRef.current) {
        restoringRef.current = false;
        return;
      }
      evaluateTriggers({ virtualizer, items, pagination, itemCount, threshold, state: triggerState });
    },
    [items, pagination, itemCount, threshold],
  );

  // Applies the prepend correction: the anchor's new offset (still under the OLD `leadingSpace`)
  // minus its captured offset is the shift; the spacer absorbs it so item and scroll offsets both
  // stay put. Only the remainder -- growing past the spacer while at the head -- moves the thumb.
  useLayoutEffect(() => {
    const virtualizer = virtualizerRef.current;
    const anchor = anchorRef.current;
    anchorRef.current = null;
    if (!virtualizer || !anchor || !items) {
      return;
    }
    const newIndex = items.findIndex((item) => getId(item) === anchor.id);
    const atHead = triggerState.pagination.current?.atHead === true;
    if (newIndex < 0) {
      // No overlap with the outgoing window (e.g. a reset to a fresh first page).
      if (leadingSpaceRef.current !== 0) {
        leadingSpaceRef.current = 0;
        setLeadingSpace(0);
      }
      evaluateTriggers({
        virtualizer,
        items,
        pagination: triggerState.pagination.current,
        itemCount,
        threshold,
        state: triggerState,
      });
      return;
    }
    const newStart = virtualizer.measurementsCache[newIndex]?.start;
    if (newStart == null) {
      return;
    }
    const shift = newStart - anchor.start;
    const previousSpace = leadingSpaceRef.current;
    const nextSpace = atHead ? 0 : Math.max(0, previousSpace - shift);
    const scrollAdjust = shift + (nextSpace - previousSpace);
    if (nextSpace !== previousSpace) {
      leadingSpaceRef.current = nextSpace;
      setLeadingSpace(nextSpace);
    }
    if (scrollAdjust !== 0) {
      // The head-reset snap: a one-shot move, not a chain, so skip re-evaluating triggers here --
      // `virtualizer.scrollOffset` won't reflect it until the (suppressed) scroll event fires.
      restoringRef.current = true;
      virtualizer.scrollToOffset((virtualizer.scrollOffset ?? 0) + scrollAdjust);
    } else {
      evaluateTriggers({
        virtualizer,
        items,
        pagination: triggerState.pagination.current,
        itemCount,
        threshold,
        state: triggerState,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, getId]);

  return { onChange, leadingSpace };
};
