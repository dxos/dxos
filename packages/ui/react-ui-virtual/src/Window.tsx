//
// Copyright 2026 DXOS.org
//

import React, {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type EdgeDrift, type Extents, type Layout, Placement } from './placement.ts';
import { useFollow } from './useFollow.ts';

/**
 * What the window needs from a model, structurally — `ListModel`/`FeedModel` satisfy it, and the
 * virtualizer stays importable without the model layer. The contract is SPEC F-7.1: a change says
 * what it was (`prepended`), so the anchor is told rather than left to infer it from identities.
 */
export type WindowModel = {
  readonly count: number;
  getId: (index: number) => string;
  subscribe: (
    listener: (change: { prepended?: number; appended?: number; updated?: readonly string[] }) => void,
  ) => () => void;
};

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
  model: WindowModel;
  extents: Extents;
  /** Which way the list runs. The principles hold either way; only this mapping differs (§9). */
  axis?: WindowAxis;
  overscan?: number;
  /** Empty extent after the last row, so it can be scrolled to the top of the viewport (§7). */
  reserve?: number;
  /**
   * Keep the last row against the end of the viewport as content arrives.
   *
   * Consumed by the trivial `Window` binding, which composes `useFollow`; `useWindow` itself knows
   * nothing about following — the intent, the withdrawal and the glide are the aspect's (SPEC §Aspects).
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
  model,
  extents,
  axis = 'block',
  overscan,
  reserve = 0,
  onEdge,
  onMismatch,
  onChange,
  controllerRef,
}: UseWindowOptions): UseWindowResult => {
  const windowRef = useRef<HTMLDivElement>(null);
  const [, render] = useState(0);
  const invalidate = useCallback(() => render((value) => value + 1), []);

  const count = model.count;
  const getId = model.getId;

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

  // Told before anything consults the model: `getId` is a closure over the host's list, so the one
  // captured at construction names rows that no longer exist there.
  placement.setGetId(getId);

  // Which end the model grew at, told by the model (SPEC F-7.1). The engine used to reconstruct
  // this by scanning for the previous first id — the model's own knowledge, recovered from its
  // absence; the scan survives only in `ListModel.replace`, the adapter for hosts that hand over a
  // whole new array and genuinely do not know what changed. The model publishes synchronously, so
  // a prepend reaches the anchor in the same tick it happens; the render-time guard below covers
  // the one gap — a *new* model instance arriving mid-render, before the effect re-subscribes.
  useEffect(() => {
    const unsubscribe = model.subscribe((change) => {
      placement.setCount(model.count, { prepended: change.prepended ?? 0 });
      invalidate();
    });

    placement.setCount(model.count, {});
    invalidate();
    return unsubscribe;
  }, [model, placement, invalidate]);

  if (placement.count !== model.count) {
    placement.setCount(model.count, {});
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

      // A childless row is genuinely empty (an empty render mounts no chrome): record its zero,
      // or the estimate survives for ever and pools as phantom extent. A row WITH children that
      // measures zero is mid-construction, and recording that would be wrong twice over.
      if (actual !== declared && (actual || row.childElementCount === 0)) {
        placement.measure(id, actual);
        changed = true;
      }
    }

    // The start edge's drift is repaid, not merely reported: row 0 at a negative position is a top
    // of the document no scroll can reach. Content and offset move by the same delta in the same
    // commit, so the mounted rows hold their place on screen while the coordinate system comes
    // true. Only while row 0 is mounted — everywhere else the incoherence is invisible, and the
    // write is not: a scrollTop write cancels any native smooth travel in flight, which read as the
    // toolbar's step dying two stops short. §7 holds mid-list; the top is the one place it cannot.
    const shift = placement.layout().first === 0 ? placement.rebaseStart() : 0;
    if (shift !== 0) {
      const scroller = scrollerRef.current;
      if (scroller) {
        if (axis === 'block') {
          scroller.scrollTop = placement.scroll;
        } else {
          scroller.scrollLeft = placement.scroll;
        }
      }

      changed = true;
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
export const Window = ({ classNames, children, controllerRef, ...options }: WindowProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inner = useRef<WindowController>(null);
  const { placement, windowRef, offset, sizerExtent, first, last } = useWindow({
    ...options,
    scrollerRef,
    controllerRef: inner,
  });
  const axis = options.axis ?? 'block';
  const main = axis === 'block' ? 'height' : 'width';
  const { getId } = options.model;

  // When the model last actually changed — what the follow may chase (see useFollow.changedAt).
  const changedAtRef = useRef(performance.now());
  useEffect(() => options.model.subscribe(() => (changedAtRef.current = performance.now())), [options.model]);

  // The binding composes the aspect; the hook knows nothing about following. Graduates with the
  // virtualizer — nothing in it is about messages.
  const follow = useFollow({
    scrollerRef,
    placement,
    extent: sizerExtent,
    count: options.model.count,
    axis,
    reserve: options.reserve,
    enabled: options.sticky,
    changedAt: () => changedAtRef.current,
  });

  // The exposed controller answers the follow before it moves (see FollowHandle.onNavigate).
  useImperativeHandle(
    controllerRef,
    () => ({
      scrollToIndex: (index, align, behavior) => {
        follow.onNavigate(index);
        inner.current?.scrollToIndex(index, align, behavior);
      },
    }),
    [follow],
  );

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
