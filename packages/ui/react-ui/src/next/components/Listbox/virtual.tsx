//
// Copyright 2026 DXOS.org
//

import React, { type RefCallback, useCallback, useLayoutEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

/**
 * How a long list mounts its rows (AUDIT §6 group B). `fixed` windows them: only the rows in view (plus an overscan) are
 * mounted, spacer rows stand in for the rest, and every row must be one height (a dev warning names a list whose rows
 * differ). `measured` windows rows of any height, measuring each as it mounts and estimating the rest from those
 * measured so far. `variable` mounts every row with `content-visibility: auto`, so rows of any height skip layout off
 * screen but every row still renders.
 */
export type VirtualMode = 'fixed' | 'measured' | 'variable';

/** Whether a mode mounts only the rows in view, so the caller renders the spans and spacers. */
export const isWindowed = (mode: VirtualMode | undefined): mode is 'fixed' | 'measured' =>
  mode === 'fixed' || mode === 'measured';

export type UseVirtualRowsOptions = {
  mode?: VirtualMode;
  /** The number of rows the list holds. */
  count: number;
  /** Rows mounted beyond each edge of the view. */
  overscan?: number;
  /** A row kept mounted outside the window (e.g. the roving tabstop), so DOM focus is never unmounted. */
  pinned?: number;
  /** Selects the rows `fixed` takes its pitch from (default: the list's non-spacer children); e.g. to skip animating rows. */
  measure?: string;
  /**
   * Selects exactly one element per mounted row, in row order (default: the list's non-spacer children); `measured`
   * observes each one's size and maps it onto the mounted spans to know which row it is.
   */
  rows?: string;
};

/** A run of mounted rows, `[first, last]` inclusive. */
export type VirtualSpan = { first: number; last: number };

export type VirtualRows = {
  /** Binds the list element; it scrolls itself or is scrolled by its nearest scrolling ancestor. */
  listRef: RefCallback<HTMLElement>;
  /** The mounted range, inclusive; the whole list unless windowed. */
  first: number;
  last: number;
  /** Heights of the spacers before and after the mounted rows. */
  before: number;
  after: number;
  /** The mounted runs in row order: the window, plus the `pinned` row's own run when it is outside it. */
  spans: VirtualSpan[];
  /** The height a spacer takes in place of the unmounted rows `[from, to)` (between spans). */
  spacer: (from: number, to: number) => number;
  /** Scrolls the row at `index` into view, mounting it; for zag's `scrollToIndexFn`. */
  scrollToIndex: (index: number) => void;
};

const DEFAULT_OVERSCAN = 8;
/** A row height to window with before the first row is measured. */
const NOMINAL_ROW = 32;

const SPACER_ATTRIBUTE = 'data-virtual-spacer';

const scrollerOf = (list: HTMLElement): HTMLElement => {
  for (let element: HTMLElement | null = list; element; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return element;
    }
  }
  return list.ownerDocument.scrollingElement instanceof HTMLElement ? list.ownerDocument.scrollingElement : list;
};

/** The list's top within its scroller's content, so a list below other content windows from where it starts. */
const offsetIn = (list: HTMLElement, scroller: HTMLElement): number =>
  scroller === list ? 0 : list.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

const mountedRows = (list: HTMLElement, selector: string | undefined): HTMLElement[] =>
  selector
    ? Array.from(list.querySelectorAll<HTMLElement>(selector))
    : Array.from(list.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute(SPACER_ATTRIBUTE),
      );

const spansOf = (first: number, last: number, pinned: number | undefined): VirtualSpan[] => {
  if (last < first) {
    return [];
  }
  if (pinned === undefined || (pinned >= first && pinned <= last)) {
    return [{ first, last }];
  }
  return pinned < first
    ? [
        { first: pinned, last: pinned },
        { first, last },
      ]
    : [
        { first, last },
        { first: pinned, last: pinned },
      ];
};

/**
 * Row heights for `measured`: each mounted row's own, and the mean of those for a row not yet mounted. A `fixed` list
 * has one height for every row, the first mounted row's.
 */
class RowHeights {
  #heights = new Map<number, number>();
  #total = 0;
  readonly measured: boolean;
  fixed = NOMINAL_ROW;
  gap = 0;

  constructor(measured: boolean) {
    this.measured = measured;
  }

  /** Records a row's height; returns whether it changed. */
  set(index: number, height: number): boolean {
    const previous = this.#heights.get(index);
    if (previous !== undefined && Math.abs(previous - height) <= 0.5) {
      return false;
    }
    this.#total += height - (previous ?? 0);
    this.#heights.set(index, height);
    return true;
  }

  /** Drops the rows past the end of a list that shrank, so their heights no longer weigh on the estimate. */
  truncate(count: number): void {
    for (const [index, height] of this.#heights) {
      if (index >= count) {
        this.#heights.delete(index);
        this.#total -= height;
      }
    }
  }

  get(index: number): number {
    if (!this.measured) {
      return this.fixed;
    }
    return this.#heights.get(index) ?? (this.#heights.size > 0 ? this.#total / this.#heights.size : NOMINAL_ROW);
  }

  /** The extent of rows `[from, to)` with the gaps between them. */
  extent(from: number, to: number): number {
    if (to <= from) {
      return 0;
    }
    if (!this.measured) {
      return (to - from) * (this.fixed + this.gap) - this.gap;
    }
    let extent = (to - from - 1) * this.gap;
    for (let index = from; index < to; index++) {
      extent += this.get(index);
    }
    return extent;
  }
}

/**
 * Windowing shared by the Next lists (Listbox, OrderedList, Tree). With `fixed` or `measured` it tracks the scroll
 * position of the list's scroller and returns the spans of rows to mount and the spacer heights around them; the caller
 * renders `VirtualSpacer`s and the spans. With `variable` or no mode every row is mounted; `variable` lists set
 * `data-virtual='variable'` so the theme defers off-screen rows.
 */
export const useVirtualRows = ({
  mode,
  count,
  overscan = DEFAULT_OVERSCAN,
  pinned,
  measure,
  rows: rowsSelector,
}: UseVirtualRowsOptions): VirtualRows => {
  const windowed = isWindowed(mode);
  const measured = mode === 'measured';
  const listRef = useRef<HTMLElement | null>(null);
  const [list, setList] = useState<HTMLElement | null>(null);
  const heightsRef = useRef<RowHeights | null>(null);
  if (heightsRef.current?.measured !== measured) {
    heightsRef.current = new RowHeights(measured);
  }
  const heights = heightsRef.current;
  const warnedRef = useRef(false);
  const [range, setRange] = useState({ first: 0, last: 2 * overscan });
  const spansRef = useRef<VirtualSpan[]>([]);
  // Found once per list: walking the ancestors' computed styles on every scroll event costs a style read each time.
  const scrollerRef = useRef<HTMLElement | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);
  const observedRef = useRef(new Map<Element, { index: number; height?: number }>());

  const bind = useCallback<RefCallback<HTMLElement>>((element) => {
    listRef.current = element;
    setList(element);
  }, []);

  const update = useCallback(() => {
    const element = listRef.current;
    const scroller = scrollerRef.current;
    if (!element || !scroller) {
      return;
    }
    const start = Math.max(0, scroller.scrollTop - offsetIn(element, scroller));
    const end = start + scroller.clientHeight;
    let first: number;
    let last: number;
    if (measured) {
      // Walked rather than divided, since every row may differ; the first row whose bottom passes the view's top,
      // through the last row whose top is above its bottom.
      first = count;
      last = count - 1;
      let top = 0;
      for (let index = 0; index < count; index++) {
        const bottom = top + heights.get(index);
        if (first === count && bottom > start) {
          first = index;
        }
        if (top >= end) {
          last = index - 1;
          break;
        }
        top = bottom + heights.gap;
      }
      first = Math.max(0, Math.min(first, count - 1) - overscan);
      last = Math.min(count - 1, last + overscan);
    } else {
      const pitch = heights.fixed + heights.gap;
      first = Math.max(0, Math.floor(start / pitch) - overscan);
      last = Math.min(count - 1, Math.ceil(end / pitch) + overscan);
    }
    setRange((range) => (range.first === first && range.last === last ? range : { first, last }));
  }, [count, overscan, measured, heights]);

  // `measured` rows report their own heights through a ResizeObserver, which reads them after layout rather than
  // forcing a layout on every render. Created before the effect below, so a list's first rows are observed in the
  // commit that mounts them.
  useLayoutEffect(() => {
    if (!measured || !list) {
      return;
    }
    const observed = observedRef.current;
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const row = observed.get(entry.target);
        const height = entry.borderBoxSize[0]?.blockSize;
        if (row && height !== undefined) {
          row.height = height;
          changed = heights.set(row.index, height) || changed;
        }
      }
      if (changed) {
        update();
      }
    });
    resizeRef.current = observer;
    return () => {
      observer.disconnect();
      observed.clear();
      resizeRef.current = null;
    };
  }, [measured, list, heights, update]);

  // Maps each mounted row element to its index, which reads no layout; a row that moved keeps its element and size, so
  // no resize reports it at its new index and its last height is carried over here.
  useLayoutEffect(() => {
    const observer = resizeRef.current;
    if (!measured || !list || !observer) {
      return;
    }
    heights.truncate(count);
    const rows = mountedRows(list, rowsSelector);
    const indices = spansRef.current.flatMap(({ first, last }) =>
      Array.from({ length: last - first + 1 }, (_, offset) => first + offset),
    );
    // A count that disagrees means the selector is not one element per row, and no height could be attributed.
    if (rows.length !== indices.length) {
      return;
    }
    const observed = observedRef.current;
    const mounted = new Set<Element>(rows);
    for (const element of observed.keys()) {
      if (!mounted.has(element)) {
        observer.unobserve(element);
        observed.delete(element);
      }
    }
    rows.forEach((element, position) => {
      const index = indices[position];
      const row = observed.get(element);
      if (!row) {
        observed.set(element, { index });
        observer.observe(element);
      } else if (row.index !== index) {
        row.index = index;
        if (row.height !== undefined) {
          heights.set(index, row.height);
        }
      }
    });
  });

  // A `fixed` list's rows are all the first mounted row's height.
  useLayoutEffect(() => {
    if (!windowed || measured || !list) {
      return;
    }
    const rows = mountedRows(list, measure);
    const height = rows[0]?.getBoundingClientRect().height;
    if (height) {
      const changed = Math.abs(height - heights.fixed) > 0.5;
      heights.fixed = height;
      // The window was computed with the nominal pitch until now.
      if (changed) {
        update();
      }
      if (process.env.NODE_ENV !== 'production' && !warnedRef.current) {
        const other = rows.find((row) => Math.abs(row.getBoundingClientRect().height - height) > 0.5);
        if (other) {
          warnedRef.current = true;
          log.warn("virtual='fixed' rows differ in height; use virtual='measured'", {
            expected: height,
            actual: other.getBoundingClientRect().height,
          });
        }
      }
    }
  });

  useLayoutEffect(() => {
    if (!windowed || !list) {
      return;
    }
    const scroller = scrollerOf(list);
    scrollerRef.current = scroller;
    heights.gap = Number.parseFloat(getComputedStyle(list).rowGap) || 0;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    scroller.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', update);
      scrollerRef.current = null;
    };
  }, [windowed, list, heights, update]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const element = listRef.current;
      const scroller = scrollerRef.current;
      if (!windowed || !element || !scroller) {
        return;
      }
      const top = offsetIn(element, scroller) + heights.extent(0, index) + (index > 0 ? heights.gap : 0);
      const height = heights.get(index);
      if (top < scroller.scrollTop) {
        scroller.scrollTop = top;
      } else if (top + height > scroller.scrollTop + scroller.clientHeight) {
        scroller.scrollTop = top + height - scroller.clientHeight;
      }
      update();
    },
    [windowed, heights, update],
  );

  if (!windowed) {
    const spans = spansOf(0, count - 1, undefined);
    spansRef.current = spans;
    return {
      listRef: bind,
      first: 0,
      last: count - 1,
      before: 0,
      after: 0,
      spans,
      spacer: () => 0,
      scrollToIndex,
    };
  }

  const first = Math.min(range.first, Math.max(0, count - 1));
  const last = Math.min(range.last, count - 1);
  // A spacer takes the place of its rows and the gaps between them; the grid adds the gap beside it.
  const spacer = (from: number, to: number) => heights.extent(from, to);
  const spans = spansOf(first, last, pinned !== undefined && pinned < count ? pinned : undefined);
  spansRef.current = spans;
  return {
    listRef: bind,
    first,
    last,
    before: spacer(0, spans[0]?.first ?? 0),
    after: spacer((spans.at(-1)?.last ?? -1) + 1, count),
    spans,
    spacer,
    scrollToIndex,
  };
};

export type VirtualSpacerProps = {
  height: number;
};

/** Stands in for the unmounted rows of a windowed list; renders nothing when no rows are hidden on its side. */
export const VirtualSpacer = ({ height }: VirtualSpacerProps) =>
  height > 0 ? <div role='none' aria-hidden='true' data-virtual-spacer='' style={{ height }} /> : null;
