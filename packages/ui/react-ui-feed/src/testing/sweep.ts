//
// Copyright 2026 DXOS.org
//

/** One leg of the traversal, in ms. Down then up, so a sweep is twice this. */
const LEG_DURATION = 6_000;

export type SweepOptions = {
  /** Time for one leg (ms). @default 6000 */
  duration?: number;
  /** Called once the return leg lands, or when cancelled. */
  onDone?: () => void;
};

/**
 * Scrolls an element top to bottom and back over a fixed duration.
 *
 * A measured pass has to be the same gesture every time or the numbers cannot be compared between
 * stories, and a 2,000-row feed is far too long to fling by hand. Fixed duration rather than fixed
 * speed, because the two stories being compared disagree about how tall the document is until their
 * rows have measured — a fixed speed would traverse them by different amounts.
 *
 * The remaining distance is re-read every frame for the same reason: `scrollHeight` grows as
 * estimates are replaced by measurements, and a target computed once would stop short.
 */
export const sweepScroll = (element: HTMLElement, { duration = LEG_DURATION, onDone }: SweepOptions = {}) => {
  let frame = 0;
  let cancelled = false;
  let start = performance.now();
  let leg: 'down' | 'up' = 'down';

  const finish = () => {
    cancelAnimationFrame(frame);
    onDone?.();
  };

  const tick = (now: number) => {
    if (cancelled) {
      return;
    }

    const limit = element.scrollHeight - element.clientHeight;
    const progress = Math.min((now - start) / duration, 1);
    element.scrollTop = leg === 'down' ? limit * progress : limit * (1 - progress);

    if (progress < 1) {
      frame = requestAnimationFrame(tick);
      return;
    }

    if (leg === 'down') {
      leg = 'up';
      start = now;
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
