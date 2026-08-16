//
// Copyright 2026 DXOS.org
//

/**
 * Travel speed (px/s) of a measured pass: about what a hard trackpad fling reaches on a 120Hz
 * display, and the speed at which a reader still expects to see content rather than a blur.
 *
 * Not "the whole document in N seconds", which was the first attempt: 2,000 rows in six seconds is
 * 40,000 px/s — some 400 rows a second, each one a CodeMirror view to mount and measure — and it
 * collapsed the frame rate to 3fps on hardware that idles at 120. That measured the sweep, not the
 * list.
 */
const VELOCITY = 3_000;

/** Time spent travelling in each direction (ms), so a pass covers the same distance in every story. */
const LEG_DURATION = 5_000;

export type SweepOptions = {
  /** Travel speed in px/s. @default 3000 */
  velocity?: number;
  /** Time for one leg (ms). @default 5000 */
  duration?: number;
  /** Called once the return leg lands, or when cancelled. */
  onDone?: () => void;
};

/**
 * Scrolls an element down and back at a fixed speed.
 *
 * A measured pass has to be one repeatable gesture or the numbers cannot be compared between
 * stories, and a 2,000-row feed is far too long to fling by hand. Fixed speed for a fixed time —
 * rather than a fixed fraction of the document — so the two stories being compared travel the same
 * distance even though they disagree about how tall the document is until their rows have measured.
 */
export const sweepScroll = (
  element: HTMLElement,
  { velocity = VELOCITY, duration = LEG_DURATION, onDone }: SweepOptions = {},
) => {
  let frame = 0;
  let cancelled = false;
  let start = performance.now();
  let last = start;
  let leg: 'down' | 'up' = 'down';

  const finish = () => {
    cancelAnimationFrame(frame);
    onDone?.();
  };

  const tick = (now: number) => {
    if (cancelled) {
      return;
    }

    // Stepped by elapsed time rather than by frame, so a dropped frame costs smoothness but not
    // distance — two passes over the same feed cover the same ground however each one rendered.
    const step = (velocity * (now - last)) / 1000;
    last = now;
    const limit = element.scrollHeight - element.clientHeight;
    element.scrollTop = Math.max(0, Math.min(element.scrollTop + (leg === 'down' ? step : -step), limit));

    if (now - start < duration) {
      frame = requestAnimationFrame(tick);
      return;
    }

    if (leg === 'down') {
      leg = 'up';
      start = now;
      last = now;
      frame = requestAnimationFrame(tick);
      return;
    }

    finish();
  };

  frame = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    finish();
  };
};
