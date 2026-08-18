//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback } from 'react';

import { type Stop } from '../model';
import { type WindowController } from '../virtualizer';

export type UseFeedNavigationOptions = {
  controller: RefObject<WindowController | null>;
  /** The stops policy's current answer; asked per press, so a policy change needs no rewiring. */
  stops: () => readonly Stop[];
  /** The row containing the scroll offset — the cursor, derived and never set beside the scroll. */
  current: () => number;
  count: () => number;
  /** Align the last stop to the end unless space is reserved past it (the reserve is scrollable). */
  scrollPastEnd?: boolean;
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
  scrollPastEnd,
}: UseFeedNavigationOptions): FeedNavigation => {
  const jumpTo = useCallback(
    (index: number, behavior: ScrollBehavior = 'auto') => {
      const align = !scrollPastEnd && index >= count() - 1 ? 'end' : 'start';
      controller.current?.scrollToIndex(index, align, behavior);
    },
    [controller, count, scrollPastEnd],
  );

  const step = useCallback(
    (delta: number) => {
      const all = stops();
      if (!all.length) {
        return;
      }

      const at = current();
      const next =
        delta > 0
          ? (all.find(({ index }) => index > at) ?? all[all.length - 1])
          : ([...all].reverse().find(({ index }) => index < at) ?? all[0]);

      jumpTo(next.index, 'smooth');
    },
    [stops, current, jumpTo],
  );

  const first = useCallback(() => jumpTo(0), [jumpTo]);
  const last = useCallback(() => jumpTo(count() - 1), [jumpTo, count]);

  return { step, jumpTo, first, last };
};
