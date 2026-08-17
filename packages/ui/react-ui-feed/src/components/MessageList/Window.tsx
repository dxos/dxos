//
// Copyright 2026 DXOS.org
//

import React, {
  type ReactNode,
  type Ref,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type EdgeDrift, type Extents, Placement } from './placement';

/**
 * The DOM shape, and nothing else.
 *
 * Three elements: a **sizer** that holds no rows and exists only to give the thumb something to
 * measure, a **window** holding the mounted rows in normal flow, and the scroller around them. The
 * window is absolutely positioned and moved by a transform, so a correction changes one number and
 * never touches `scrollTop` — which is what stops corrections and the reader sharing a channel (§7).
 *
 * Rows are unpositioned. A row that changes extent reflows the ones after it, in the browser, in the
 * same frame; the alternative was re-placing every row below it ourselves on every frame of the
 * change — measured at 177 re-placements for one disclosure opening (§6).
 *
 * Knows nothing about messages, markdown or CodeMirror. What it renders is whatever `children`
 * returns, which is what lets `placement/*` drive it with content that cannot lie about its size.
 */
export type WindowAxis = 'block' | 'inline';

/**
 * What a toolbar or a readout needs, and nothing more.
 *
 * Published rather than rendered: chrome belongs to the host (§2), so the window says where it is
 * and the host decides what to draw about it.
 */
export type WindowState = {
  /** The row at the top of the viewport — what "where am I" means to a reader. */
  index: number;
  visible: { first: number; last: number };
  /** The mounted range, which includes the overscan the reader cannot see. */
  mounted: { first: number; last: number };
  count: number;
  /**
   * The same thing in pixels, which is what a map of the list has to draw.
   *
   * `window` is the mounted parent's span in content space — where the rows that exist actually are —
   * and `total` is what the thumb is scaled against. A map drawn from indices instead would be a map
   * of the model rather than of the layout, and it is the layout that goes wrong.
   */
  geometry: { scroll: number; viewport: number; total: number; window: { start: number; extent: number } };
};

export type WindowController = {
  scrollToIndex: (index: number, align?: 'start' | 'end') => void;
};

export type WindowProps = ThemedClassName<{
  count: number;
  getId: (index: number) => string;
  extents: Extents;
  /** Which way the list runs. The principles hold either way; only this mapping differs (§9). */
  axis?: WindowAxis;
  overscan?: number;
  /** Empty extent after the last row, so it can be scrolled to the top of the viewport (§7). */
  reserve?: number;
  /** What an edge revealed about the estimates, if it revealed anything. */
  onEdge?: (drift: EdgeDrift) => void;
  /** A row whose declared extent was not the extent it rendered at. `exact` means do not correct — not do not check (§8). */
  onMismatch?: (mismatch: { index: number; id: string; declared: number; actual: number }) => void;
  onChange?: (state: WindowState) => void;
  controllerRef?: Ref<WindowController>;
  children: (index: number, id: string) => ReactNode;
}>;

/** Extent of the mounted rows, which is the parent's own size in content space. */
const windowExtentOf = (placement: Placement, first: number, last: number): number => {
  let extent = 0;
  for (let index = first; index <= last; index++) {
    extent += placement.extentOf(index);
  }

  return extent;
};

export const Window = ({
  classNames,
  count,
  getId,
  extents,
  axis = 'block',
  overscan,
  reserve = 0,
  onEdge,
  onMismatch,
  onChange,
  controllerRef,
  children,
}: WindowProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [, render] = useState(0);
  const invalidate = useCallback(() => render((value) => value + 1), []);

  // Held across renders, and told about the model rather than rebuilt from it: the anchor is state,
  // and rebuilding would discard the one position that is known exactly.
  const placement = useMemo(
    () => new Placement({ count, getId, extents, viewport: 0, overscan }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // A mismatch is news the first time and noise afterwards. Without this the report is emitted on
  // every commit, and a host that renders the report re-renders on it — which is an infinite loop,
  // found by `placement/Drift` on its first run.
  const reported = useRef(new Set<string>());

  const previousCount = useRef(count);
  if (previousCount.current !== count) {
    // Rows arriving before the reader shift every index; the anchor's *position* is untouched, which
    // is why a prepend moves nothing at or after it.
    const prepended = Math.max(0, count - previousCount.current);
    placement.setCount(count, { prepended: getId(0) !== placement.anchor.id && prepended ? prepended : 0 });
    previousCount.current = count;
  }

  // Navigation, not correction. The rule that corrections never touch `scrollTop` (§7) is about the
  // list moving itself; a reader asking to be somewhere is the one case where moving the scroll is
  // the whole point.
  useImperativeHandle(
    controllerRef,
    () => ({
      scrollToIndex: (index, align) => {
        const scroller = scrollerRef.current;
        placement.jumpTo(index, align);
        if (scroller) {
          if (axis === 'block') {
            scroller.scrollTop = placement.scroll;
          } else {
            scroller.scrollLeft = placement.scroll;
          }
        }

        invalidate();
      },
    }),
    [placement, axis, invalidate],
  );

  placement.setReserve(reserve);

  const main = axis === 'block' ? 'height' : 'width';

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const read = () => (axis === 'block' ? scroller.clientHeight : scroller.clientWidth);
    placement.setViewport(read());
    const observer = new ResizeObserver(() => {
      placement.setViewport(read());
      invalidate();
    });

    observer.observe(scroller);
    const onScroll = () => {
      placement.scrollTo(axis === 'block' ? scroller.scrollTop : scroller.scrollLeft);
      invalidate();
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    invalidate();
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [placement, axis, invalidate]);

  // Measured after every commit, so a row that grows later — a font, a portaled widget, an image —
  // is not a special case but the same case arriving again (§8).
  useLayoutEffect(() => {
    const parent = windowRef.current;
    if (!parent) {
      return;
    }

    let changed = false;
    for (const element of parent.children) {
      const row = element as HTMLElement;
      const index = Number(row.dataset.index);
      const id = row.dataset.objectId!;
      const actual = Math.round(axis === 'block' ? row.offsetHeight : row.offsetWidth);
      const declared = placement.extentOf(index);
      if (extents.exact) {
        const key = `${id}:${declared}:${actual}`;
        if (actual !== declared && !reported.current.has(key)) {
          reported.current.add(key);
          onMismatch?.({ index, id, declared, actual });
        }
        continue;
      }

      if (actual && actual !== declared) {
        placement.measure(id, actual);
        changed = true;
      }
    }

    // Deduped for the same reason as a mismatch: an edge is news the first time it is reached, and
    // a host that renders the report would otherwise re-render on it for ever.
    const drift = placement.drift();
    const key = drift && `${drift.edge}:${drift.delta}`;
    if (drift && key && !reported.current.has(key)) {
      reported.current.add(key);
      onEdge?.(drift);
    }

    if (changed) {
      invalidate();
    }
  });

  const { first, last, visible, offset, sizerExtent } = placement.layout();
  const announced = useRef<string>('');
  const state = `${visible.first}:${visible.last}:${first}:${last}:${count}`;
  if (onChange && announced.current !== state) {
    announced.current = state;
    // In render rather than an effect, so a readout never lags the frame it describes by one.
    const scroller = scrollerRef.current;
    const viewport = (axis === 'block' ? scroller?.clientHeight : scroller?.clientWidth) ?? 0;
    const extent = windowExtentOf(placement, first, last);
    queueMicrotask(() =>
      onChange({
        index: visible.first,
        visible,
        mounted: { first, last },
        count,
        geometry: { scroll: placement.scroll, viewport, total: sizerExtent, window: { start: offset, extent } },
      }),
    );
  }

  const rows = [];
  for (let index = first; index <= last; index++) {
    rows.push(
      <div key={getId(index)} data-index={index} data-object-id={getId(index)}>
        {children(index, getId(index))}
      </div>,
    );
  }

  return (
    <div
      ref={scrollerRef}
      className={mx('relative', axis === 'block' ? 'overflow-y-auto' : 'overflow-x-auto', classNames)}
      // Off deliberately: the browser adjusting the scroll as well would be a second party anchoring
      // the same thing, and the defect this design exists to remove is exactly that (§6).
      style={{ overflowAnchor: 'none' }}
      data-testid='window.scroller'
    >
      <div style={{ [main]: sizerExtent }} data-testid='window.sizer' />
      <div
        ref={windowRef}
        className={mx('absolute top-0 left-0 flex', axis === 'block' ? 'flex-col w-full' : 'flex-row h-full')}
        style={{ transform: axis === 'block' ? `translateY(${offset}px)` : `translateX(${offset}px)` }}
        data-testid='window.window'
      >
        {rows}
      </div>
    </div>
  );
};
