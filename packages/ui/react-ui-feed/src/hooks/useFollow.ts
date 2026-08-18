//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { type Placement } from '../virtualizer/placement';
import { ScrollFollower } from './follow';

/** Distance from the end within which the reader counts as being at it. */
const STICKY_THRESHOLD = 32;

/** How long after a gesture a scroll is still attributable to the reader. */
const GESTURE_WINDOW = 300;

export type FollowHandle = {
  /**
   * A navigation is the reader answering "do you want the tail?" — and it must answer *before* the
   * scroll moves. The intent is otherwise withdrawn by the scroll event the jump raises, which is
   * asynchronous: the correction effect can run in between, still believe the reader is following,
   * and snap them straight back to the tail they just left. Found by the outline rail — a click
   * near the top of a sticky feed moved the list a few pixels and no further.
   */
  onNavigate: (index: number) => void;
};

export type UseFollowOptions = {
  scrollerRef: RefObject<HTMLElement | null>;
  /** The placement whose `endOffset` is the tail's resting place. */
  placement: Placement;
  /** Total content extent — the correction re-runs when it changes, which is how growth is noticed. */
  extent: number;
  count: number;
  axis?: 'block' | 'inline';
  /** Empty extent after the last row; the end the follow rests at is before it. */
  reserve?: number;
  /** The standing intent: off means this hook does nothing at all. */
  enabled?: boolean;
  /**
   * Travel to a moved tail instead of teleporting (DECIDED: default on).
   *
   * The glide only covers gaps up to a viewport: beyond that the reader could not have followed the
   * motion anyway, and the travel would cross rows whose extents are still estimates.
   */
  glide?: boolean;
};

/**
 * The sticky tail as an intent (SPEC: useFollow) — a policy over the window, not part of it.
 *
 * Withdrawn by one thing only: a scroll that moves *backwards*. That is the reader; a correction
 * never moves the offset back, it moves the end away. Re-deriving the intent from proximity on
 * every commit cannot survive its own corrections — measuring the tail grows the document under a
 * reader who has not moved, the gap opens past any threshold worth having, and the follow reads
 * that as the reader leaving and disengages for good (`bridge/Tail`, the second defect).
 *
 * Reusable for any streaming container — transcripts, logs — because nothing here knows about
 * messages: it needs a scroller, a placement, and the two numbers that say the content grew.
 */
export const useFollow = ({
  scrollerRef,
  placement,
  extent,
  count,
  axis = 'block',
  reserve = 0,
  enabled,
  glide = true,
}: UseFollowOptions): FollowHandle => {
  const following = useRef(!!enabled);
  const wasEnabled = useRef(enabled);
  if (wasEnabled.current !== enabled) {
    wasEnabled.current = enabled;
    following.current = !!enabled;
  }

  /**
   * Where the reader has to be for the last row's rendered edge to rest on the viewport's.
   *
   * From the row's own rectangle when it is mounted, and from the arithmetic only when it is not:
   * measured extents are rounded to integers and rendered rows are fractional, so over a mounted
   * window the sum drifts from the layout by tens of pixels — an "arrived" that the reader can see
   * is short. The rect already includes the window's transform, so the delta is exact.
   */
  const endTarget = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return 0;
    }

    const last = scroller.querySelector<HTMLElement>(`[data-index="${count - 1}"]`);
    if (last) {
      const current = axis === 'block' ? scroller.scrollTop : scroller.scrollLeft;
      const delta =
        axis === 'block'
          ? last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom
          : last.getBoundingClientRect().right - scroller.getBoundingClientRect().right;
      return Math.max(0, Math.round(current + delta));
    }

    return placement.endOffset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, axis, placement, scrollerRef.current]);

  // The glide, built once per scroller. Speeds are in rows, so it asks the placement for a live
  // median of what is mounted rather than being handed a constant.
  const follower = useMemo(() => {
    const scroller = scrollerRef.current;
    if (!scroller || axis !== 'block') {
      return undefined;
    }

    return new ScrollFollower(scroller, {
      // Faster than the class's defaults, which were tuned for a single arrival: a streaming answer
      // grows at hundreds of px/s, and a follow that cannot outrun the growth reads as falling
      // behind for the whole turn. The ramp is what keeps this from feeling like a snap.
      maxSpeed: 8,
      acceleration: 32,
      deceleration: 10,
      // The follower's target is DOM-derived (scrollHeight - trailing - viewport); the authoritative
      // end is the placement's (the last row's own edge, which the document disagrees with by the
      // drift while estimates are being replaced). Expressing the placement's end *as* a trailing
      // makes the two the same number.
      trailing: () => scroller.scrollHeight - scroller.clientHeight - endTarget(),
      rowHeight: () => {
        const { first, last } = placement.layout();
        const sizes = [];
        for (let index = first; index <= last; index++) {
          sizes.push(placement.extentOf(index));
        }

        sizes.sort((a, b) => a - b);
        const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 100;
        return Math.min(median, scroller.clientHeight || median);
      },
    });
    // The scroller element is stable for the life of the binding; reserve is read through the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollerRef.current, axis, placement, endTarget]);
  useLayoutEffect(() => () => follower?.cancel(), [follower]);

  // The intent, read from gestures. Own listener and own last-offset, deliberately: the window's
  // scroll handler updates `placement.scroll` before this runs, so comparing against it would read
  // every scroll as stationary.
  // Why a backwards scroll alone cannot be the withdrawal: the machinery scrolls backwards too. A
  // shrinking turn makes the browser clamp the offset by itself; a correction can move up; and none
  // of it is the reader. Direction plus pre-announcement was tried and kept dying in races — this
  // is the old engine's proven rule instead: the follow writes `scrollTop`, it does not turn wheels
  // or press keys, so a scroll counts as the reader's only when a gesture preceded it. Returning to
  // the tail, by any means, opts back in.
  const lastOffset = useRef(0);
  const gestureAt = useRef(0);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !enabled) {
      return;
    }

    const onGesture = () => {
      gestureAt.current = performance.now();
    };

    const onScroll = () => {
      const current = axis === 'block' ? scroller.scrollTop : scroller.scrollLeft;
      const viewport = axis === 'block' ? scroller.clientHeight : scroller.clientWidth;
      const total = axis === 'block' ? scroller.scrollHeight : scroller.scrollWidth;
      const back = current < lastOffset.current - 1;
      lastOffset.current = current;
      if (total - reserve - current - viewport <= STICKY_THRESHOLD) {
        following.current = true;
      } else if (back && performance.now() - gestureAt.current < GESTURE_WINDOW) {
        following.current = false;
        follower?.cancel();
      }
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    // Every way a reader can move a scroll container by hand: the wheel, a touch drag, the
    // keyboard, and a pointer on the scrollbar itself.
    for (const event of ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const) {
      scroller.addEventListener(event, onGesture, { passive: true });
    }

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      for (const event of ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const) {
        scroller.removeEventListener(event, onGesture);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollerRef.current, enabled, axis, reserve, follower]);

  // The correction. Following is a navigation, not a correction in the §7 sense: the content the
  // reader is pinned to has moved, so the scroll has to as well.
  //
  // Through `endOffset` rather than a jump: a jump re-bases the model on a sum of estimates, and
  // this effect runs again every time the document's extent changes — so each answer mounted rows
  // whose measurement changed the sum the next answer was drawn from. That recurs rather than
  // converging, and React ends it by exceeding the update limit. Keyed on the extent as well as the
  // count: measuring the rows a scroll reveals moves the end, so a tail pinned once drifts off it
  // as the estimates are replaced.
  // Whether the feed has arrived at its tail once. Opening a populated feed is not motion to
  // follow — the reader was not watching the travel, so it arrives; the glide is for content
  // arriving at a tail they are looking at.
  const positioned = useRef(false);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!enabled || !following.current || !count || !scroller) {
      return;
    }

    const target = endTarget();
    const current = axis === 'block' ? scroller.scrollTop : scroller.scrollLeft;
    const gap = target - current;
    if (Math.abs(gap) <= 1) {
      positioned.current = true;
      return;
    }

    const viewport = axis === 'block' ? scroller.clientHeight : scroller.clientWidth;
    if (positioned.current && glide && follower && gap > 0 && gap <= viewport) {
      // The follower recomputes its target every frame, so content arriving faster than the travel
      // keeps the target ahead; when the arrivals stop, the travel lands by decelerating.
      follower.start();
      return;
    }

    // A far tail, a backwards correction, or no glide: arrive rather than travel. Written directly,
    // never followed by an invalidate — the write raises a scroll event, which re-renders, which
    // changes the extent this effect watches; invalidating here as well is a loop, and React says so.
    follower?.cancel();
    placement.scrollTo(target);
    // Pre-announced, so the write's own scroll event cannot read as a gesture: a correction can
    // move the offset *backwards* (an over-estimated tail shrinking), and the intent listener would
    // otherwise take that for the reader leaving and withdraw the follow for good.
    lastOffset.current = target;
    if (axis === 'block') {
      scroller.scrollTop = target;
    } else {
      scroller.scrollLeft = target;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, count, extent, placement, axis, glide, follower, endTarget, scrollerRef.current]);

  const onNavigate = useCallback(
    (index: number) => {
      const wants = index >= count - 1;
      following.current = !!enabled && wants;
      if (!wants) {
        follower?.cancel();
      }
    },
    [enabled, count, follower],
  );

  return { onNavigate };
};
