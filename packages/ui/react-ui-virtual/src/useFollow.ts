//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { ScrollFollower } from './follow';
import { type Placement } from './placement';

/** Distance from the end within which the reader counts as being at it. */
const STICKY_THRESHOLD = 32;

/** How long after a gesture a scroll is still attributable to the reader. */
const GESTURE_WINDOW = 300;

/** How long after a model change growth still counts as content arriving. */
const FOLLOW_WINDOW = 1_000;

/** Frames an instant arrival re-checks itself against the paint before trusting it. */
const SETTLE_FRAMES = 12;

export type FollowHandle = {
  /**
   * Whether the reader is resting on the end, within {@link STICKY_THRESHOLD}.
   *
   * Published as state rather than read from the intent ref, so a host can render an affordance
   * against it — the intent is a ref precisely because the correction must not re-render, and a
   * second scroll listener in the host would fork the threshold.
   */
  atEnd: boolean;
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
  /** Empty extent after the last row, included in the resting view: the tail sits above it. */
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
  /**
   * When the content last actually changed — a model event, not a measurement.
   *
   * The follow moves the view only while new content is arriving AND the reader is pinned to the
   * bottom. Extent alone cannot say why the document grew: a widget toggled open near the tail
   * grows it too, and correcting for that snaps the reader's toggle out from under them — the feed
   * "jumps to place its bottom at the bottom". Growth is followed only within a beat of a model
   * change; everything else is the reader rearranging what they already have.
   */
  changedAt?: () => number;
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
  changedAt,
}: UseFollowOptions): FollowHandle => {
  const following = useRef(!!enabled);
  // A feed shorter than its viewport never scrolls, so it starts at its end and no event says so.
  const [atEnd, setAtEnd] = useState(true);
  const wasEnabled = useRef(enabled);
  if (wasEnabled.current !== enabled) {
    wasEnabled.current = enabled;
    following.current = !!enabled;
  }

  // Read through a ref by the stable callbacks below: the count changes on every append, and a
  // handle rebuilt per append republishes every controller derived from it — a host that stores
  // that controller in state then loops on its own effect (`Maximum update depth exceeded`).
  const countRef = useRef(count);
  countRef.current = count;

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

    const last = scroller.querySelector<HTMLElement>(`[data-index="${countRef.current - 1}"]`);
    if (last) {
      const current = axis === 'block' ? scroller.scrollTop : scroller.scrollLeft;
      const delta =
        axis === 'block'
          ? last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom
          : last.getBoundingClientRect().right - scroller.getBoundingClientRect().right;
      // The reserve is part of the resting view: the tail sits that much clear of the edge.
      return Math.max(0, Math.round(current + delta + reserve));
    }

    return placement.endOffset() + reserve;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, placement, reserve, scrollerRef.current]);

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
      const end = total - current - viewport <= STICKY_THRESHOLD;
      // Same threshold as the intent, one listener: React bails out on an unchanged value, so a
      // pinned feed streaming for minutes re-renders nothing.
      setAtEnd(end);
      if (end) {
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

    // Arrival and small repayments are always allowed; *growth* is followed only while content just
    // changed. A widget toggled open near the tail grows the document exactly as a streamed chunk
    // does, and correcting for it snaps the reader's toggle out from under them — but the few-pixel
    // residues of estimates settling are the tail being kept honest, model change or none.
    // Growth is followed only while content just changed; shrink is always repaid. The document
    // growing says nothing about why — a streamed chunk and a widget's opening animation look the
    // same from here, and a size allowance fails too, because an animation grows in sub-threshold
    // steps. Only the model can say "content arrived". Shrink is different: the content's end moved
    // *up* (a panel closed, estimates settled), and repaying it keeps the tail honest without ever
    // pushing the reader's view down.
    if (positioned.current && gap > 1 && changedAt && performance.now() - changedAt() > FOLLOW_WINDOW) {
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
    const write = (value: number) => {
      placement.scrollTo(value);
      // Pre-announced, so the write's own scroll event cannot read as a gesture: a correction can
      // move the offset *backwards* (an over-estimated tail shrinking), and the intent listener
      // would otherwise take that for the reader leaving and withdraw the follow for good.
      lastOffset.current = value;
      if (axis === 'block') {
        scroller.scrollTop = value;
      } else {
        scroller.scrollLeft = value;
      }
    };

    write(target);

    // Verified against the paint, a few frames, because the write and the layout can disagree: the
    // rect this target was read from can still be mid-reflow (widgets settling to their measured
    // height), and an arrival 88px off that nothing re-fires for is a tail that simply rests wrong.
    // Bounded, shrink-only repayment (positive residue is growth, which the gate owns).
    let verifies = SETTLE_FRAMES;
    const verify = () => {
      if (!following.current || verifies-- <= 0) {
        return;
      }

      const residue = endTarget() - (axis === 'block' ? scroller.scrollTop : scroller.scrollLeft);
      if (residue < -1) {
        write(endTarget());
      }

      requestAnimationFrame(verify);
    };

    requestAnimationFrame(verify);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, count, extent, placement, axis, glide, follower, endTarget, scrollerRef.current]);

  const onNavigate = useCallback(
    (index: number) => {
      const wants = index >= countRef.current - 1;
      following.current = !!enabled && wants;
      if (!wants) {
        follower?.cancel();
      }
    },
    [enabled, follower],
  );

  // Stable across appends, so controllers built over it do not churn per model change; `atEnd`
  // changes only when the reader crosses the threshold, which is not an append.
  return useMemo(() => ({ atEnd, onNavigate }), [atEnd, onNavigate]);
};
