//
// Copyright 2026 DXOS.org
//

import React, { type RefCallback, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

/**
 * How a long list mounts its rows (AUDIT §6 group B). `fixed` windows them: only the rows in view (plus an overscan) are
 * mounted, spacer rows stand in for the rest, and every row must be one height (a dev warning names a list whose rows
 * differ). `variable` mounts every row with `content-visibility: auto`, so rows of any height skip layout off screen.
 */
export type VirtualMode = 'fixed' | 'variable';

export type UseVirtualRowsOptions = {
  mode?: VirtualMode;
  /** The number of rows the list holds. */
  count: number;
  /** Rows mounted beyond each edge of the view. */
  overscan?: number;
};

export type VirtualRows = {
  /** Binds the list element; it scrolls itself or is scrolled by its nearest scrolling ancestor. */
  listRef: RefCallback<HTMLElement>;
  /** The mounted range, inclusive; the whole list unless `fixed`. */
  first: number;
  last: number;
  /** Heights of the spacers before and after the mounted rows. */
  before: number;
  after: number;
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

const mountedRows = (list: HTMLElement) =>
  Array.from(list.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute(SPACER_ATTRIBUTE),
  );

/**
 * Windowing shared by the Next lists (Listbox, OrderedList, Tree). With `fixed` it tracks the scroll position of the
 * list's scroller and returns the range of rows to mount and the spacer heights around them; the caller renders
 * `VirtualSpacer`s and the slice. With `variable` or no mode every row is mounted; `variable` lists set
 * `data-virtual='variable'` so the theme defers off-screen rows.
 */
export const useVirtualRows = ({ mode, count, overscan = DEFAULT_OVERSCAN }: UseVirtualRowsOptions): VirtualRows => {
  const fixed = mode === 'fixed';
  const listRef = useRef<HTMLElement | null>(null);
  const [list, setList] = useState<HTMLElement | null>(null);
  const rowRef = useRef(NOMINAL_ROW);
  const gapRef = useRef(0);
  const warnedRef = useRef(false);
  const [range, setRange] = useState({ first: 0, last: 2 * overscan });

  const bind = useCallback<RefCallback<HTMLElement>>((element) => {
    listRef.current = element;
    setList(element);
  }, []);

  const update = useCallback(() => {
    const element = listRef.current;
    if (!element) {
      return;
    }
    const scroller = scrollerOf(element);
    const offset =
      scroller === element
        ? 0
        : element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const pitch = rowRef.current + gapRef.current;
    const start = Math.max(0, scroller.scrollTop - offset);
    const first = Math.max(0, Math.floor(start / pitch) - overscan);
    const last = Math.min(count - 1, Math.ceil((start + scroller.clientHeight) / pitch) + overscan);
    setRange((range) => (range.first === first && range.last === last ? range : { first, last }));
  }, [count, overscan]);

  // The pitch comes from the mounted rows; every row is assumed to be the first one's height.
  useLayoutEffect(() => {
    if (!fixed || !list) {
      return;
    }
    const rows = mountedRows(list);
    const height = rows[0]?.getBoundingClientRect().height;
    if (height) {
      rowRef.current = height;
      gapRef.current = Number.parseFloat(getComputedStyle(list).rowGap) || 0;
      if (process.env.NODE_ENV !== 'production' && !warnedRef.current) {
        const other = rows.find((row) => Math.abs(row.getBoundingClientRect().height - height) > 0.5);
        if (other) {
          warnedRef.current = true;
          log.warn("virtual='fixed' rows differ in height; use virtual='variable'", {
            expected: height,
            actual: other.getBoundingClientRect().height,
          });
        }
      }
    }
  });

  useEffect(() => {
    if (!fixed || !list) {
      return;
    }
    const scroller = scrollerOf(list);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    scroller.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', update);
    };
  }, [fixed, list, update]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const element = listRef.current;
      if (!fixed || !element) {
        return;
      }
      const scroller = scrollerOf(element);
      const offset =
        scroller === element
          ? 0
          : element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const pitch = rowRef.current + gapRef.current;
      const top = offset + index * pitch;
      if (top < scroller.scrollTop) {
        scroller.scrollTop = top;
      } else if (top + rowRef.current > scroller.scrollTop + scroller.clientHeight) {
        scroller.scrollTop = top + rowRef.current - scroller.clientHeight;
      }
      update();
    },
    [fixed, update],
  );

  if (!fixed) {
    return { listRef: bind, first: 0, last: count - 1, before: 0, after: 0, scrollToIndex };
  }

  const pitch = rowRef.current + gapRef.current;
  const first = Math.min(range.first, Math.max(0, count - 1));
  const last = Math.min(range.last, count - 1);
  // A spacer takes the place of its rows and the gaps between them; the grid adds the gap beside it.
  const spacer = (rows: number) => (rows > 0 ? rows * pitch - gapRef.current : 0);
  return {
    listRef: bind,
    first,
    last,
    before: spacer(first),
    after: spacer(count - 1 - last),
    scrollToIndex,
  };
};

export type VirtualSpacerProps = {
  height: number;
};

/** Stands in for the unmounted rows of a `fixed` list; renders nothing when no rows are hidden on its side. */
export const VirtualSpacer = ({ height }: VirtualSpacerProps) =>
  height > 0 ? <div role='none' aria-hidden='true' data-virtual-spacer='' style={{ height }} /> : null;
