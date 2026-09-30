//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useMemo, useRef } from 'react';

import { type WindowController } from '@dxos/react-ui-virtual';

import { type Stop } from '../model/index.ts';

/** How long a commanded destination outranks the scroll offset as "where the reader is". */
const PENDING_WINDOW = 1_500;

export type UseFeedNavigationOptions = {
  controller: RefObject<WindowController | null>;
  /** The stops policy's current answer; asked per press, so a policy change needs no rewiring. */
  stops: () => readonly Stop[];
  /** The row containing the scroll offset — the cursor, derived and never set beside the scroll. */
  current: () => number;
  count: () => number;
  /**
   * Told before every jump, with the target index — the follow's `onNavigate` goes here. Without
   * it a navigation races the follow's correction effect, which runs before the jump's scroll
   * event can withdraw the intent and snaps the reader straight back to the tail they just left.
   * The follow may move the view only while content is arriving AND the reader has pinned
   * themselves to the bottom; navigating into the feed un-pins by definition.
   */
  onNavigate?: (index: number) => void;
};

export type FeedNavigation = {
  /** Move by `delta` stops. Every press travels: see below. */
  step: (delta: number) => void;
  /** Jump to a stop (or a raw index), aligning the last row to the end where that is what it means. */
  jumpTo: (index: number, behavior?: ScrollBehavior) => void;
  first: () => void;
  last: () => void;
};

/**
 * The one navigation seam (SPEC: useFeedNavigation): toolbar buttons, arrow keys, the outline rail
 * and the minimap all call this, so they cannot disagree about what a step is.
 *
 * Stepping is from the row containing the scroll offset. The stop above it begins strictly higher
 * and the stop below strictly lower, so every press moves the viewport — an index compared against
 * a position cannot promise that while positions are still being measured. Steps glide (corrections
 * move the window, not the scroll, so nothing cancels the animation); far jumps are instant, since
 * a glide across unmounted rows is a journey over a blank screen.
 *
 * Distinct from react-ui-list's `useListNavigation`, which is focus traversal over fully-mounted
 * rows — a different problem in the same naming family.
 */
export const useFeedNavigation = ({
  controller,
  stops,
  current,
  count,
  onNavigate,
}: UseFeedNavigationOptions): FeedNavigation => {
  // The last commanded destination, while its travel may still be in flight. A step during a glide
  // must chain from where the reader is *going*, not from wherever the scroll happens to be this
  // frame — deriving from the offset mid-travel re-finds the same stop, and rapid presses swallow
  // each other (seen live: the toolbar's up button "not reliably" stepping). Expires rather than
  // waiting on arrival, because a scroll the reader takes over is theirs again.
  const pending = useRef<{ index: number; at: number } | undefined>(undefined);

  // Hosts hand the accessors as inline closures, so their identity churns per render; read through
  // a ref so the seam itself is stable — a controller derived from it and stored in a host's state
  // otherwise republishes every render, which is a setState-in-effect loop.
  const optionsRef = useRef({ stops, current, count, onNavigate });
  optionsRef.current = { stops, current, count, onNavigate };

  const jumpTo = useCallback(
    (index: number, behavior: ScrollBehavior = 'auto') => {
      const { count, onNavigate } = optionsRef.current;
      pending.current = { index, at: performance.now() };
      onNavigate?.(index);
      const align = index >= count() - 1 ? 'end' : 'start';
      controller.current?.scrollToIndex(index, align, behavior);
    },
    [controller],
  );

  const step = useCallback(
    (delta: number) => {
      const { stops, current } = optionsRef.current;
      const all = stops();
      if (!all.length) {
        return;
      }

      const flight = pending.current;
      const at =
        flight && performance.now() - flight.at < PENDING_WINDOW && flight.index !== current()
          ? flight.index
          : current();
      const next =
        delta > 0
          ? (all.find(({ index }) => index > at) ?? all[all.length - 1])
          : ([...all].reverse().find(({ index }) => index < at) ?? all[0]);

      jumpTo(next.index, 'smooth');
    },
    [jumpTo],
  );

  const first = useCallback(() => jumpTo(0), [jumpTo]);

  const last = useCallback(() => {
    const { count } = optionsRef.current;
    jumpTo(count() - 1);
  }, [jumpTo]);

  return useMemo(() => ({ step, jumpTo, first, last }), [step, jumpTo, first, last]);
};
