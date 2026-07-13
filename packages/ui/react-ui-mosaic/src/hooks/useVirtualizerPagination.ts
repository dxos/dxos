//
// Copyright 2026 DXOS.org
//

import { type Virtualizer } from '@tanstack/react-virtual';
import { type MutableRefObject, useCallback, useLayoutEffect, useRef, useState } from 'react';

import { type GetId } from '@dxos/react-ui-dnd';

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

  /** Rows from either loaded edge at which the adjacent page is requested. @default 12. */
  threshold?: number;
};

export type UseVirtualizerPaginationResult = {
  onChange: (virtualizer: Virtualizer<any, any>) => void;
  /** Extra scrollable space (px) to feed into the virtualizer's `paddingStart`. */
  leadingSpace: number;
};

//
// Edge-trigger evaluation
//

/** A retained item's identity and pre-change offset. */
type Anchor = { id: string; start: number };

/** Position of the loaded window relative to the viewport, independent of what's rendered. */
type EdgeGeometry = {
  scrollOffset: number;
  viewportHeight: number;
  /** Index of the topmost/bottommost *rendered* row; undefined if nothing overlaps the viewport. */
  firstVisibleIndex: number | undefined;
  lastVisibleIndex: number | undefined;
  /** Absolute start/end of the whole loaded window, defined even when nothing is rendered there. */
  windowStart: number | undefined;
  windowEnd: number | undefined;
};

const readEdgeGeometry = (virtualizer: Virtualizer<any, any>): EdgeGeometry => {
  const virtualItems = virtualizer.getVirtualItems();
  // `measurementsCache` covers the whole array even when nothing is rendered (deep in the spacer).
  const measurements = virtualizer.measurementsCache;
  return {
    scrollOffset: virtualizer.scrollOffset ?? 0,
    viewportHeight: virtualizer.scrollElement?.clientHeight ?? 0,
    firstVisibleIndex: virtualItems.at(0)?.index,
    lastVisibleIndex: virtualItems.at(-1)?.index,
    windowStart: measurements[0]?.start,
    windowEnd: measurements.at(-1)?.end,
  };
};

const isNearBottomEdge = (geometry: EdgeGeometry, itemCount: number, threshold: number): boolean =>
  geometry.lastVisibleIndex !== undefined
    ? geometry.lastVisibleIndex >= nextPageIndexThreshold(itemCount, threshold)
    : geometry.windowEnd != null && geometry.scrollOffset + geometry.viewportHeight > geometry.windowEnd;

const isNearTopEdge = (geometry: EdgeGeometry, threshold: number): boolean =>
  geometry.firstVisibleIndex !== undefined
    ? geometry.firstVisibleIndex < threshold
    : geometry.windowStart != null && geometry.scrollOffset < geometry.windowStart;

/** Loaded content doesn't reach the viewport's top edge (e.g. scrolled into the leading spacer). */
const isBlankAbove = (geometry: EdgeGeometry): boolean =>
  geometry.windowStart != null && geometry.windowStart > geometry.scrollOffset;

/** Loaded content doesn't reach the viewport's bottom edge. */
const isBlankBelow = (geometry: EdgeGeometry): boolean =>
  geometry.windowEnd != null && geometry.windowEnd < geometry.scrollOffset + geometry.viewportHeight;

/** Per-direction dedup/throttle state for `evaluateTriggers`, independent of item type. */
type TriggerState = {
  lastNextRequestedItemsRef: MutableRefObject<unknown>;
  lastPreviousRequestedItemsRef: MutableRefObject<unknown>;
  lastGetNextScrollRef: MutableRefObject<number | null>;
  lastGetPreviousScrollRef: MutableRefObject<number | null>;
  paginationRef: MutableRefObject<VirtualizerPaginationController | undefined>;
};

/** Not fired at this exact scroll offset since the edge was last left, unless blank re-arms it. */
const canRequestNext = (state: TriggerState, geometry: EdgeGeometry): boolean =>
  state.lastGetNextScrollRef.current === null ||
  geometry.scrollOffset !== state.lastGetNextScrollRef.current ||
  isBlankBelow(geometry);

const canRequestPrevious = (state: TriggerState, geometry: EdgeGeometry): boolean =>
  state.lastGetPreviousScrollRef.current === null ||
  geometry.scrollOffset !== state.lastGetPreviousScrollRef.current ||
  isBlankAbove(geometry);

const requestNext = (state: TriggerState, items: unknown, scrollOffset: number): void => {
  state.lastNextRequestedItemsRef.current = items;
  state.lastGetNextScrollRef.current = scrollOffset;
  const getNext = state.paginationRef.current?.getNext;
  queueMicrotask(() => getNext?.());
};

const requestPrevious = (state: TriggerState, items: unknown, scrollOffset: number): void => {
  state.lastPreviousRequestedItemsRef.current = items;
  state.lastGetPreviousScrollRef.current = scrollOffset;
  const getPrevious = state.paginationRef.current?.getPrevious;
  queueMicrotask(() => getPrevious?.());
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
 * Requests `getNext`/`getPrevious` once the loaded window's edge nears the viewport. Deduped per
 * direction and per `items` snapshot; re-armed while the viewport sits in blank space so a chain
 * of pages loads back-to-back without further user scrolling.
 */
const evaluateTriggers = ({ virtualizer, items, pagination, itemCount, threshold, state }: EvaluateTriggersOptions) => {
  const geometry = readEdgeGeometry(virtualizer);
  const scrollable = isScrollable(virtualizer);
  const smallWindow = itemCount <= threshold;
  const nearBottom = isNearBottomEdge(geometry, itemCount, threshold);
  const nearTop = isNearTopEdge(geometry, threshold);

  if (!nearBottom) {
    state.lastGetNextScrollRef.current = null;
  }
  if (!nearTop) {
    state.lastGetPreviousScrollRef.current = null;
  }

  const triggerNext =
    !!pagination?.getNext &&
    !pagination.isLoading &&
    scrollable &&
    nearBottom &&
    (!smallWindow || geometry.scrollOffset > 0) &&
    canRequestNext(state, geometry);
  const triggerPrevious =
    !!pagination?.getPrevious &&
    !pagination.isLoading &&
    scrollable &&
    nearTop &&
    pagination.atHead !== true &&
    canRequestPrevious(state, geometry);

  if (!triggerNext) {
    state.lastNextRequestedItemsRef.current = undefined;
  }
  if (!triggerPrevious) {
    state.lastPreviousRequestedItemsRef.current = undefined;
  }

  if (triggerNext && state.lastNextRequestedItemsRef.current !== items) {
    requestNext(state, items, geometry.scrollOffset);
  } else if (triggerPrevious && state.lastPreviousRequestedItemsRef.current !== items) {
    requestPrevious(state, items, geometry.scrollOffset);
  }
};

//
// Front-edge (eviction/prepend) reconciliation
//

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

type FrontEdgeChange =
  | { kind: 'none' }
  | { kind: 'evicted'; evictedHeight: number }
  | { kind: 'prepended'; anchor: Anchor | null };

/**
 * Classifies how `items` changed at the front, relative to `prevItems`, using only the outgoing
 * window's own measurements (no need to wait for the incoming render). `'evicted'` covers both a
 * prefix eviction (the window slid forward) and a pure append (the window grew) -- either way the
 * item now at the front was already loaded, so its height is already known. `'prepended'` covers
 * everything else (a `getPrevious` prepend, or a reset to a disjoint range).
 */
const classifyFrontEdgeChange = <TItem>(
  prevItems: readonly TItem[] | TItem[] | undefined,
  items: readonly TItem[] | TItem[] | undefined,
  getId: GetId<TItem>,
  virtualizer: Virtualizer<any, any> | null,
): FrontEdgeChange => {
  if (!virtualizer || !prevItems) {
    return { kind: 'none' };
  }
  const firstNewId = items?.[0] != null ? getId(items[0]) : undefined;
  const oldIndexOfNewFirst = firstNewId != null ? prevItems.findIndex((item) => getId(item) === firstNewId) : -1;
  if (oldIndexOfNewFirst >= 0) {
    return { kind: 'evicted', evictedHeight: evictedPrefixHeight(virtualizer, oldIndexOfNewFirst) };
  }
  const newIds = new Set(items?.map((item) => getId(item)));
  return { kind: 'prepended', anchor: findRetainedAnchor(prevItems, newIds, getId, virtualizer) };
};

//
// Prepend correction (deferred to a layout effect; see the hook's own doc comment for why)
//

type PrependCorrection =
  | { kind: 'no-overlap' }
  | { kind: 'pending' }
  | { kind: 'absorbed'; nextSpace: number }
  | { kind: 'snap'; nextSpace: number; scrollAdjust: number };

/**
 * `'no-overlap'`: the anchor isn't in the new `items` (e.g. a reset) -- the spacer no longer
 * describes anything. `'pending'`: the incoming render hasn't measured the anchor yet. `'absorbed'`:
 * the shift is fully absorbed by the spacer, no scroll rewrite needed. `'snap'`: growing past an
 * empty spacer (or the `atHead` reset) leaves a remainder that has to move the scroll offset.
 */
const computePrependCorrection = <TItem>(
  virtualizer: Virtualizer<any, any>,
  items: readonly TItem[] | TItem[],
  getId: GetId<TItem>,
  anchor: Anchor,
  currentSpace: number,
  atHead: boolean,
): PrependCorrection => {
  const newIndex = items.findIndex((item) => getId(item) === anchor.id);
  if (newIndex < 0) {
    return { kind: 'no-overlap' };
  }
  const newStart = virtualizer.measurementsCache[newIndex]?.start;
  if (newStart == null) {
    return { kind: 'pending' };
  }
  const shift = newStart - anchor.start;
  const nextSpace = atHead ? 0 : Math.max(0, currentSpace - shift);
  const scrollAdjust = shift + (nextSpace - currentSpace);
  return scrollAdjust === 0 ? { kind: 'absorbed', nextSpace } : { kind: 'snap', nextSpace, scrollAdjust };
};

//
// Hook
//

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
 * Eviction (`classifyFrontEdgeChange`'s `'evicted'`) is corrected synchronously during the same
 * render that observes the new `items`, since the evicted height is already known -- deferring it
 * would let the browser observe (and clamp `scrollTop` against) a momentary, too-short frame.
 * Prepending (`'prepended'`) is corrected one render later, from a layout effect
 * (`computePrependCorrection`), since the prepended items' heights aren't known until the incoming
 * render measures them; that lag is safe because prepending only ever grows content before the
 * spacer shrinks to match.
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
  const setSpacer = useCallback((nextSpace: number) => {
    if (nextSpace !== leadingSpaceRef.current) {
      leadingSpaceRef.current = nextSpace;
      setLeadingSpace(nextSpace);
    }
  }, []);

  const virtualizerRef = useRef<Virtualizer<any, any> | null>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const prevItemsRef = useRef(items);
  // Suppresses trigger evaluation for the scroll event that our own correction below causes.
  const restoringRef = useRef(false);

  const triggerState: TriggerState = {
    lastNextRequestedItemsRef: useRef<unknown>(undefined),
    lastPreviousRequestedItemsRef: useRef<unknown>(undefined),
    lastGetNextScrollRef: useRef<number | null>(null),
    lastGetPreviousScrollRef: useRef<number | null>(null),
    paginationRef: useRef(pagination),
  };
  triggerState.paginationRef.current = pagination;

  const rearmTriggers = useCallback(
    (virtualizer: Virtualizer<any, any>) => {
      evaluateTriggers({
        virtualizer,
        items,
        pagination: triggerState.paginationRef.current,
        itemCount,
        threshold,
        state: triggerState,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, itemCount, threshold],
  );

  // Classifies the front-edge change during render, before `Mosaic.VirtualStack` re-renders with
  // the new `items` -- at this point `virtualizerRef.current` still reflects the outgoing array.
  // Skipped entirely when `pagination` is unset, so a caller not using pagination never gets
  // spacer/anchor bookkeeping for an unrelated `items` change (e.g. a sort or filter).
  if (prevItemsRef.current !== items) {
    if (pagination) {
      const change = classifyFrontEdgeChange(prevItemsRef.current, items, getId, virtualizerRef.current);
      if (change.kind === 'evicted') {
        setSpacer(leadingSpaceRef.current + change.evictedHeight);
        anchorRef.current = null;
      } else if (change.kind === 'prepended') {
        anchorRef.current = change.anchor;
        if (!change.anchor) {
          // No retained item to anchor on (a disjoint reset): the layout effect below never runs
          // its own reset for this case, since it bails out early on a null anchor.
          setSpacer(0);
        }
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
      rearmTriggers(virtualizer);
    },
    [rearmTriggers],
  );

  useLayoutEffect(() => {
    const virtualizer = virtualizerRef.current;
    const anchor = anchorRef.current;
    anchorRef.current = null;
    if (!virtualizer || !anchor || !items) {
      return;
    }
    const atHead = triggerState.paginationRef.current?.atHead === true;
    const correction = computePrependCorrection(virtualizer, items, getId, anchor, leadingSpaceRef.current, atHead);
    switch (correction.kind) {
      case 'pending':
        return;
      case 'no-overlap':
        setSpacer(0);
        rearmTriggers(virtualizer);
        return;
      case 'absorbed':
        setSpacer(correction.nextSpace);
        rearmTriggers(virtualizer);
        return;
      case 'snap':
        // A one-shot move, not a chain, so `rearmTriggers` is skipped: `virtualizer.scrollOffset`
        // won't reflect this until the (suppressed) scroll event fires.
        setSpacer(correction.nextSpace);
        restoringRef.current = true;
        virtualizer.scrollToOffset((virtualizer.scrollOffset ?? 0) + correction.scrollAdjust);
        return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, getId, setSpacer, rearmTriggers]);

  return { onChange, leadingSpace };
};
