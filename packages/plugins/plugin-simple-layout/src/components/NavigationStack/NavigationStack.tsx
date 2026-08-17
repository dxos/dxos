//
// Copyright 2026 DXOS.org
//

import React, {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

import { type ThemedClassName, useMediaQuery } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * UIKit's push/pop timing. A single ease-out curve carries the whole transition: the incoming panel
 * travels the full width while the outgoing one covers a third of it, which is what reads as depth
 * rather than as two panes sliding in lockstep.
 */
const TRANSITION_MS = 400;
const TRANSITION_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** Fraction of the viewport the outgoing panel travels; UIKit parallaxes the old view at ~1/3 speed. */
const PARALLAX = 0.3;

/** Peak dim over the outgoing panel, matching UIKit's shade under the incoming view. */
const DIM_OPACITY = 0.12;

/** Width of the left screen-edge strip that starts an interactive pop (UIKit uses ~20pt). */
const EDGE_WIDTH_PX = 20;

/** Past this fraction of the width, releasing completes the pop rather than snapping back. */
const COMPLETE_THRESHOLD = 0.5;

/** A flick completes the pop regardless of distance travelled (px/ms). */
const COMPLETE_VELOCITY = 0.5;

type Pose = { x: number; dim: number };

/**
 * Resting pose of a panel `offset` places from the top of the stack, with an in-flight pop `drag`ged
 * `0..1` of the way home. Offsets deeper than one are parked; ahead of the top means never pushed.
 */
const poseFor = (offset: number, drag: number): Pose => {
  if (offset === 0) {
    return { x: drag * 100, dim: 0 };
  } else if (offset === -1) {
    return { x: -PARALLAX * 100 * (1 - drag), dim: DIM_OPACITY * (1 - drag) };
  } else if (offset < -1) {
    return { x: -PARALLAX * 100, dim: DIM_OPACITY };
  } else {
    return { x: 100, dim: 0 };
  }
};

const transformFor = (pose: Pose) => `translate3d(${pose.x}%, 0, 0)`;

export type NavigationStackProps = ThemedClassName<{
  /** Panel ids, root first; the panel the user has navigated to is `index`. */
  items: string[];
  /** Index of the panel currently on top of the stack. */
  index: number;
  /** Fired when an interactive pop completes, with the index to return to. */
  onIndexChange: (index: number) => void;
  renderItem: (id: string, index: number) => ReactNode;
}>;

/**
 * Mobile presentation of the layout as a UIKit navigation stack: panels are z-stacked layers rather
 * than a scrolled row, so the outgoing panel can parallax and dim beneath the incoming one — motion a
 * scroller cannot express, since every child of a scroller translates at exactly the scroll rate.
 *
 * Poses are driven through the Web Animations API and written straight to the elements, never through
 * React state. A tracked gesture must land a transform every frame, and re-rendering the stack (each
 * panel being a full content surface) to move two layers cannot hold 60fps. It also makes interruption
 * free: a single-keyframe animation takes its start from the element's current computed transform, so
 * grabbing a panel mid-push continues from wherever it actually is.
 *
 * Back is an interactive left-edge pan, per UIKit; there is deliberately no forward swipe, because a
 * navigation stack cannot be swiped into a panel that has not been pushed.
 */
export const NavigationStack = ({ classNames, items, index, onIndexChange, renderItem }: NavigationStackProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dimRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [reducedMotion] = useMediaQuery('(prefers-reduced-motion: reduce)', { fallback: false });

  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    width: number;
    lastX: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  const canPop = index > 0;

  /** Writes a pose to a layer without animating — the frame-by-frame path for a tracked gesture. */
  const applyPose = useCallback((layer: number, pose: Pose) => {
    const panel = panelRefs.current[layer];
    const dim = dimRefs.current[layer];
    if (panel) {
      panel.style.transform = transformFor(pose);
    }
    if (dim) {
      dim.style.opacity = String(pose.dim);
    }
  }, []);

  /**
   * Animates a layer to `pose`. One keyframe on purpose: the implicit start is the element's current
   * computed value, so an interrupted animation continues from where it is rather than snapping back
   * to a nominal origin. Prior animations are committed before being cancelled so that value is the
   * pose actually on screen.
   */
  const animatePose = useCallback(
    (layer: number, pose: Pose, duration: number) => {
      for (const element of [panelRefs.current[layer], dimRefs.current[layer]]) {
        for (const animation of element?.getAnimations() ?? []) {
          try {
            animation.commitStyles();
          } catch {
            // Commit throws for an element that is not rendered; cancelling alone is correct there.
          }
          animation.cancel();
        }
      }
      if (duration <= 0) {
        applyPose(layer, pose);
        return;
      }
      panelRefs.current[layer]?.animate([{ transform: transformFor(pose) }], {
        duration,
        easing: TRANSITION_EASING,
        fill: 'both',
      });
      dimRefs.current[layer]?.animate([{ opacity: pose.dim }], {
        duration,
        easing: TRANSITION_EASING,
        fill: 'both',
      });
    },
    [applyPose],
  );

  const settle = useCallback(
    (top: number, duration: number) => {
      for (let layer = 0; layer < items.length; layer++) {
        animatePose(layer, poseFor(layer - top, 0), duration);
      }
    },
    [animatePose, items.length],
  );

  // Layers that have been given a pose at least once. A single-keyframe animation starts from the
  // element's current computed transform, and a panel mounted by this render has none — it computes to
  // identity, so animating it to its resting place is a no-op from 0% to 0% and the push does not move.
  // Newly mounted layers are therefore planted at the pose they *would* have held before this
  // navigation (offset measured against the previous index, so an incoming panel starts off-screen
  // right) and animated home from there.
  const posedRef = useRef<Set<number>>(new Set());
  const previousIndexRef = useRef(index);
  // Set when an interactive pop has already animated itself; the index change it triggers arrives a
  // commit later and must not restart the motion that is still playing.
  const settledRef = useRef(false);

  useLayoutEffect(() => {
    const previous = previousIndexRef.current;
    previousIndexRef.current = index;

    for (let layer = 0; layer < items.length; layer++) {
      if (!posedRef.current.has(layer)) {
        posedRef.current.add(layer);
        applyPose(layer, poseFor(layer - previous, 0));
      }
    }
    // Drop layers the stack no longer has, so a re-pushed position is planted again rather than
    // animating from the pose its predecessor happened to leave behind.
    for (const layer of [...posedRef.current]) {
      if (layer >= items.length) {
        posedRef.current.delete(layer);
      }
    }

    if (settledRef.current) {
      settledRef.current = false;
      return;
    }
    settle(index, reducedMotion ? 0 : TRANSITION_MS);
  }, [index, items.length, settle, applyPose, reducedMotion]);

  useEffect(() => {
    return () => {
      gestureRef.current = null;
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const root = rootRef.current;
      if (!root || !canPop || gestureRef.current || event.pointerType === 'mouse') {
        return;
      }
      const bounds = root.getBoundingClientRect();
      if (event.clientX - bounds.left > EDGE_WIDTH_PX) {
        return;
      }
      gestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        width: bounds.width,
        lastX: event.clientX,
        lastT: event.timeStamp,
        velocity: 0,
      };
      root.setPointerCapture(event.pointerId);
    },
    [canPop],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }
      const dt = event.timeStamp - gesture.lastT;
      if (dt > 0) {
        gesture.velocity = (event.clientX - gesture.lastX) / dt;
        gesture.lastX = event.clientX;
        gesture.lastT = event.timeStamp;
      }
      const drag = Math.min(1, Math.max(0, event.clientX - gesture.startX) / Math.max(1, gesture.width));
      // Only the top panel and the one behind it move under the finger; writing every layer each frame
      // would touch parked panels that cannot be seen.
      applyPose(index, poseFor(0, drag));
      applyPose(index - 1, poseFor(-1, drag));
    },
    [applyPose, index],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }
      const travelled = Math.max(0, event.clientX - gesture.startX);
      const ratio = travelled / Math.max(1, gesture.width);
      const complete = ratio > COMPLETE_THRESHOLD || gesture.velocity > COMPLETE_VELOCITY;
      gestureRef.current = null;
      if (rootRef.current?.hasPointerCapture(event.pointerId)) {
        rootRef.current.releasePointerCapture(event.pointerId);
      }

      // Shorten the release to the distance still to cover, so letting go near either end finishes
      // quickly instead of replaying the full push duration over a few remaining pixels.
      const remaining = complete ? 1 - ratio : ratio;
      const duration = reducedMotion ? 0 : Math.max(120, TRANSITION_MS * remaining);
      if (complete) {
        // Animate the pop here rather than waiting for the index to change: the parent's state update
        // arrives a commit later, and settling from the new index would restart the motion.
        animatePose(index, poseFor(1, 0), duration);
        animatePose(index - 1, poseFor(0, 0), duration);
        settledRef.current = true;
        onIndexChange(index - 1);
      } else {
        animatePose(index, poseFor(0, 0), duration);
        animatePose(index - 1, poseFor(-1, 0), duration);
      }
    },
    [animatePose, index, onIndexChange, reducedMotion],
  );

  return (
    <div
      ref={rootRef}
      className={mx('relative overflow-hidden touch-pan-y', classNames)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {items.map((id, itemIndex) => {
        const offset = itemIndex - index;
        // The animatable window is one panel either side of the top. A panel leaving the top sits at
        // offset +1 for the length of the pop, so it has to stay visible to animate out.
        const nearby = Math.abs(offset) <= 1;

        return (
          // `history` may repeat an id (A -> B -> A), so key by position; the stack only ever grows or
          // shrinks at its end, which keeps the prefix keys stable across a push or a pop.
          <div
            key={`${itemIndex}:${id}`}
            ref={(element) => {
              panelRefs.current[itemIndex] = element;
            }}
            data-object-id={id}
            aria-hidden={offset > 0 || undefined}
            // Panels off the top keep their DOM (and scroll offsets) but must not take focus or
            // hit-test, or a tap can land on a panel the user cannot see.
            inert={offset > 0 || offset < -1 || undefined}
            // Opaque per layer: the outgoing panel only travels a third of the width, so the rest of it
            // stays underneath the incoming one and shows straight through a transparent panel.
            className={mx('absolute inset-0 dx-base-surface', nearby ? 'will-change-transform' : 'invisible')}
            style={{
              zIndex: itemIndex,
              // Each panel composites independently; without containment a heavy subtree re-laying out
              // mid transition drags the whole stack's frames down with it.
              contain: 'layout paint',
              backfaceVisibility: 'hidden',
            }}
          >
            {renderItem(id, itemIndex)}
            {/* Dim belongs to the outgoing panel, so it travels with the parallax rather than sitting
                still over a moving layer. */}
            <div
              ref={(element) => {
                dimRefs.current[itemIndex] = element;
              }}
              aria-hidden
              className='absolute inset-0 bg-black pointer-events-none'
              style={{ opacity: 0 }}
            />
          </div>
        );
      })}
    </div>
  );
};
