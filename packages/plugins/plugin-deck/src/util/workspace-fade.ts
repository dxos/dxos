//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/** The workspace being left fades out over this before the switch writes anything. */
const FADE_OUT_MS = 90;

/** The deck then stays faded out this long while the entered workspace renders. */
const HOLD_MS = 150;

/** And fades back in over this. */
const FADE_IN_MS = 120;

/** Slow at first: WebKit shows an animation's first frames late, so what it loses is the least of the change. */
const FADE_OUT_EASING = 'cubic-bezier(0.4, 0, 1, 1)';

const FADE_IN_EASING = 'cubic-bezier(0, 0, 0.2, 1)';

let target: HTMLElement | undefined;
let running: Animation | undefined;
let runningOn: HTMLElement | undefined;

/** Makes `element`, the deck's viewport, the one a workspace switch fades. Returns the undo. */
export const setWorkspaceFadeTarget = (element: HTMLElement): (() => void) => {
  target = element;
  return () => {
    if (target === element) {
      target = undefined;
    }
    // A finished animation still holds its element, and with it the unmounted deck.
    if (runningOn === element) {
      running = undefined;
      runningOn = undefined;
    }
  };
};

/**
 * `VITE_DX_DISABLE_ANIMATIONS`, as `animationsDisabled` in `@dxos/react-ui` reads it: the operations that fade are
 * reachable from the plugin's node and workerd entries, which must not load React.
 */
const animationsDisabled = (): boolean => {
  const value = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_DX_DISABLE_ANIMATIONS;
  return value === 'true' || value === '1';
};

const canFade = (): boolean =>
  typeof document !== 'undefined' &&
  document.visibilityState === 'visible' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !animationsDisabled();

/**
 * Starts the dip on the next frame, from wherever the deck's opacity is, and resolves once the deck is out. One
 * animation, committed while the main thread is idle: WebKit runs a committed opacity animation off the main thread,
 * but one started in a busy task, as the fade in would be mid-switch, lands in a single frame.
 */
const dip = (element: HTMLElement): Promise<void> =>
  new Promise((resolve) => {
    // A page that stops rendering never runs the frame; the switch must not wait on it, nor dip after it has written.
    let skipped = false;
    const fallback = setTimeout(() => {
      skipped = true;
      resolve();
    }, FADE_OUT_MS + 100);
    requestAnimationFrame(() => {
      if (skipped) {
        return;
      }
      const from = getComputedStyle(element).opacity;
      const duration = FADE_OUT_MS + HOLD_MS + FADE_IN_MS;
      running?.cancel();
      runningOn = element;
      running = element.animate(
        [
          { opacity: from, offset: 0, easing: FADE_OUT_EASING },
          { opacity: 0, offset: FADE_OUT_MS / duration },
          { opacity: 0, offset: (FADE_OUT_MS + HOLD_MS) / duration, easing: FADE_IN_EASING },
          { opacity: 1, offset: 1 },
        ],
        { duration },
      );
      clearTimeout(fallback);
      setTimeout(resolve, FADE_OUT_MS);
    });
  });

/**
 * Fades the deck out ahead of a workspace switch, and back in once the entered workspace has had `HOLD_MS` to render,
 * so neither the empty deck between two workspaces nor its planks arriving a commit later shows. Resolves once the
 * deck is out, for the switch to write behind it. Rendering continues throughout, which content that waits on a frame
 * or a resize needs.
 */
export const fadeOutDeck = (): Effect.Effect<void> =>
  Effect.suspend(() => {
    const element = target;
    return element && canFade() ? Effect.promise(() => dip(element)) : Effect.void;
  });
