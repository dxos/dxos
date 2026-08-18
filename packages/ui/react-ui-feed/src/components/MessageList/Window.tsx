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

import { type EdgeDrift, type Extents, type Layout, Placement } from './placement';

/** Distance from the end within which the reader counts as being at it. */
const STICKY_THRESHOLD = 32;

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
  /**
   * `behavior: 'smooth'` glides, and only over content that is mounted — a glide across rows that do
   * not exist is a journey over a blank screen, so a far target is taken instantly (§7).
   */
  scrollToIndex: (index: number, align?: 'start' | 'end', behavior?: ScrollBehavior) => void;
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
  /**
   * Keep the last row against the end of the viewport as content arrives.
   *
   * A standing intent, not a mode the list enters: at the end, appending keeps you at the end; away
   * from it, appending does not move you. The old engine spent a follow, a sticky flag, a re-base
   * and a scroll listener that had to tell the reader apart from itself on this.
   */
  sticky?: boolean;
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

/**
 * Everything the shape needs, with no opinion about who owns the scroll element.
 *
 * Split out because the DOM below is only the *simplest* binding of it. A host that already has a
 * scroll container — `MessageList` scrolls inside `ScrollArea`, which owns the overlay thumbs and
 * the padding tokens — cannot nest a second one, and would otherwise have to reimplement the
 * placement to keep its own chrome. It hands its element over instead.
 */
export type UseWindowOptions = Omit<WindowProps, 'classNames' | 'children'> & {
  /** The element being scrolled, when the host owns it. `Window` passes its own. */
  scrollerRef: React.RefObject<HTMLElement | null>;
};

export type UseWindowResult = {
  placement: Placement;
  layout: Layout;
  /** Ref for the element holding the mounted rows, which is what gets measured. */
  windowRef: React.RefObject<HTMLDivElement | null>;
  /** Extent of the whole document along the axis, reserve included: what the thumb is scaled to. */
  sizerExtent: number;
  /** Absolute position of the first mounted row, which the parent is translated by. */
  offset: number;
  first: number;
  last: number;
};

export const useWindow = ({
  scrollerRef,
  count,
  getId,
  extents,
  axis = 'block',
  overscan,
  reserve = 0,
  sticky,
  onEdge,
  onMismatch,
  onChange,
  controllerRef,
}: UseWindowOptions): UseWindowResult => {
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

  // Which end the model grew at, decided by identity rather than guessed at.
  //
  // Rows arriving *before* the reader shift every index, and the anchor has to shift with them or it
  // names a different message; rows arriving after change nothing. Comparing the first id to the
  // anchor's cannot tell those apart — it says "prepended" for every append made while the reader is
  // anywhere but the top, which shifts the anchor and moves the feed under them. Found by a sticky
  // test that passed with no sticky implementation at all, because the wrong shift happened to land
  // the tail where the test looked for it.
  // Told before anything consults the model: `getId` is a closure over the host's list, so the one
  // captured at construction names rows that no longer exist there.
  placement.setGetId(getId);

  const previousCount = useRef(count);
  const previousFirstId = useRef(count ? getId(0) : '');
  if (previousCount.current !== count) {
    const grew = Math.max(0, count - previousCount.current);
    // The old first row, if it is still there, has moved down by exactly the number prepended.
    let prepended = 0;
    for (let index = 1; index <= grew; index++) {
      if (getId(index) === previousFirstId.current) {
        prepended = index;
        break;
      }
    }

    placement.setCount(count, { prepended });
    previousCount.current = count;
    previousFirstId.current = count ? getId(0) : '';
  }

  // Navigation, not correction. The rule that corrections never touch `scrollTop` (§7) is about the
  // list moving itself; a reader asking to be somewhere is the one case where moving the scroll is
  // the whole point.
  useImperativeHandle(
    controllerRef,
    () => ({
      scrollToIndex: (index, align, behavior = 'auto') => {
        const scroller = scrollerRef.current;
        const { first, last } = placement.layout();
        // A glide only over rows that are already there. Beyond them the offset is a sum of
        // estimates, so the travel would cross content that does not exist and land somewhere the
        // measurement then corrects — a step the reader watched go to the wrong place.
        if (behavior === 'smooth' && scroller && index >= first && index <= last) {
          const target = placement.offsetOf(index, align);
          // Reported, not applied: the element animates and its scroll events drive the placement,
          // one frame at a time, so the mounted window stays under the reader for the whole journey.
          scroller.scrollTo(axis === 'block' ? { top: target, behavior } : { left: target, behavior });
          return;
        }

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

  // Told on every render, not captured once: `extents` is a function the host may replace, and a
  // placement holding the first one it was given keeps a layout that was true at mount.
  placement.setExtents(extents);
  placement.setReserve(reserve);

  const { first, last, visible, offset, sizerExtent } = placement.layout();

  const atEnd = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return false;
    }

    const viewport = axis === 'block' ? scroller.clientHeight : scroller.clientWidth;
    const offset = axis === 'block' ? scroller.scrollTop : scroller.scrollLeft;
    return scroller.scrollHeight - reserve - offset - viewport <= STICKY_THRESHOLD;
  }, [axis, reserve]);

  /**
   * Whether the reader wants the tail — an intent they hold, not a position they happen to be at.
   *
   * Re-derived from proximity on every commit it cannot survive its own corrections: measuring the
   * rows at the tail grows the document under a reader who has not moved, the gap opens past any
   * threshold worth having, and the follow reads that as the reader leaving and disengages for good.
   * The tail then rests a measurement's worth above the bottom for ever, which is what `bridge/Tail`
   * was seeing once the render loop above it was gone.
   *
   * So it is withdrawn by one thing only: a scroll that moves *backwards*. That is the reader; a
   * correction never moves the offset back, it moves the end away.
   */
  const following = useRef(!!sticky);
  const wasSticky = useRef(sticky);
  if (wasSticky.current !== sticky) {
    wasSticky.current = sticky;
    following.current = !!sticky;
  }

  // Declared before the follow, so the follow's first run has a viewport to compute an end against:
  // effects run in order, and an end measured against a viewport of zero is the whole document.
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
      const current = axis === 'block' ? scroller.scrollTop : scroller.scrollLeft;
      const back = current < placement.scroll - 1;
      placement.scrollTo(current);
      if (atEnd()) {
        following.current = true;
      } else if (back) {
        following.current = false;
      }

      invalidate();
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    invalidate();
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [placement, axis, atEnd, invalidate]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!sticky || !following.current || !count || !scroller) {
      return;
    }

    // Following is a navigation, not a correction: the content the reader is pinned to has moved, so
    // the scroll has to as well. What corrections must never do is touch it (§7).
    //
    // Through `endOffset` rather than `jumpTo`: a jump re-bases the model on a sum of estimates, and
    // this effect runs again every time the document's extent changes — so each answer mounted rows
    // whose measurement changed the sum the next answer was drawn from. That does not converge, it
    // recurs, and React ends it by exceeding the update limit rather than by settling.
    //
    // Written only when it is actually off, and never followed by an invalidate: the write raises a
    // scroll event, which re-renders, which changes the extent this effect watches. Invalidating
    // here as well is a second loop, and React says so.
    const target = placement.endOffset();
    const current = axis === 'block' ? scroller.scrollTop : scroller.scrollLeft;
    if (Math.abs(current - target) > 1) {
      placement.scrollTo(target);
      if (axis === 'block') {
        scroller.scrollTop = target;
      } else {
        scroller.scrollLeft = target;
      }
    }

    // Keyed on the document's extent as well as the count: measuring the rows a scroll reveals moves
    // the end, so a tail pinned once drifts off it as the estimates are replaced.
  }, [sticky, count, sizerExtent, placement, axis]);

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

  return {
    placement,
    layout: { first, last, visible, offset, sizerExtent },
    windowRef,
    sizerExtent,
    offset,
    first,
    last,
  };
};

/**
 * The DOM shape, and nothing else.
 *
 * Three elements: a **sizer** that holds no rows and exists only to give the thumb something to
 * measure, a **window** holding the mounted rows in normal flow, and the scroller around them.
 */
export const Window = ({ classNames, children, ...options }: WindowProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { windowRef, offset, sizerExtent, first, last } = useWindow({ ...options, scrollerRef });
  const axis = options.axis ?? 'block';
  const main = axis === 'block' ? 'height' : 'width';
  const { getId } = options;

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
