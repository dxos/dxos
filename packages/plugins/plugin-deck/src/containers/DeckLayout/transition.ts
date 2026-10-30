//
// Copyright 2026 DXOS.org
//

import * as UiHooks from '@dxos/react-ui/Hooks';

export type TransitionOptions = {
  /** The entered element counts as rendered once its DOM has gone this long without a change, */
  quietMs?: number;
  /** or after this, whatever is still loading. */
  maxHoldMs?: number;
  durationMs?: number;
  easing?: string;
};

const defaults: Required<TransitionOptions> = {
  quietMs: 80,
  maxHoldMs: 700,
  durationMs: 200,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

/** Whether a change of view should transition now: not while hidden, nor when motion is reduced or turned off. */
export const canTransition = (): boolean =>
  document.visibilityState === 'visible' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !UiHooks.animationsDisabled();

/**
 * Fades `leaving`, which lies over `entering`, out once `entering` has rendered, and calls `onDone` when it is gone.
 * Both stay live DOM throughout: a view transition would show stills, and WebKit takes the entering one before content
 * that waits on a frame or a resize has rendered. Returns the cancel, which leaves `leaving` as it was.
 */
export const transitionWhenRendered = (
  leaving: HTMLElement,
  entering: HTMLElement,
  onDone: () => void,
  options: TransitionOptions = {},
): (() => void) => {
  const { quietMs, maxHoldMs, durationMs, easing } = { ...defaults, ...options };
  let quiet: ReturnType<typeof setTimeout> | undefined;
  let frame: number | undefined;
  let animation: Animation | undefined;

  const reveal = () => {
    observer.disconnect();
    clearTimeout(quiet);
    clearTimeout(cap);
    // Started on a frame, so the compositor runs it however busy the main thread gets.
    frame = requestAnimationFrame(() => {
      animation = leaving.animate([{ opacity: getComputedStyle(leaving).opacity }, { opacity: 0 }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      });
      animation.finished.then(onDone, () => {});
    });
  };

  const observer = new MutationObserver(() => {
    clearTimeout(quiet);
    quiet = setTimeout(reveal, quietMs);
  });
  observer.observe(entering, { childList: true, subtree: true, characterData: true });
  // From now, so an entered element that has already rendered is not held until the cap.
  quiet = setTimeout(reveal, quietMs);
  const cap = setTimeout(reveal, maxHoldMs);

  return () => {
    observer.disconnect();
    clearTimeout(quiet);
    clearTimeout(cap);
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
    }
    animation?.cancel();
  };
};
