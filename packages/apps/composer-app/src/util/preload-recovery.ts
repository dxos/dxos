//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { BOOT_ASSET_FAILURE_KEY, PRELOAD_RETRY_KEY } from './constants.ts';

/** The part of `window` this needs, so the handler is testable without a DOM. */
type PreloadErrorTarget = { addEventListener: (type: string, listener: (event: Event) => void) => void };

export type PreloadErrorHandlerOptions = {
  target?: PreloadErrorTarget;
  reload?: () => void;
};

/** Vite's payload carries the failed chunk's url in its message; nothing else identifies it. */
const preloadErrorUrl = (event: Event): string | undefined => {
  const payload: unknown = 'payload' in event ? event.payload : undefined;
  const message =
    payload instanceof Error
      ? payload.message
      : typeof payload === 'object' && payload !== null && 'message' in payload
        ? payload.message
        : undefined;
  if (typeof message !== 'string') {
    return undefined;
  }
  return message.match(/https?:\/\/\S+/)?.[0];
};

/** Records the failure under the same key the boot guard uses, so the next boot reports it once. */
const recordFailure = (url: string): void => {
  const previous: unknown = JSON.parse(localStorage.getItem(BOOT_ASSET_FAILURE_KEY) ?? 'null');
  const failures =
    (typeof previous === 'object' && previous !== null && 'failures' in previous ? Number(previous.failures) || 0 : 0) +
    1;
  // Origin and path only: page urls carry invitation codes in their query.
  const page = location.origin + location.pathname;
  localStorage.setItem(BOOT_ASSET_FAILURE_KEY, JSON.stringify({ url, page, at: Date.now(), failures }));
};

/**
 * Recovers from a lazy chunk whose asset no longer exists — the state a session left open across a deploy
 * lands in, where Vite's `preloadHelper` reports `Unable to preload CSS for …` and the route stays broken.
 * The page is reloaded once per session so the new index replaces the stale one; the session-scoped guard
 * keeps a genuinely broken build from reloading forever, in which case the error is left to propagate.
 */
export const registerPreloadErrorHandler = ({
  target = window,
  reload = () => window.location.reload(),
}: PreloadErrorHandlerOptions = {}): void => {
  target.addEventListener('vite:preloadError', (event) => {
    const url = preloadErrorUrl(event);
    log.warn('lazy chunk failed to load', { url });
    try {
      if (sessionStorage.getItem(PRELOAD_RETRY_KEY)) {
        log.error('lazy chunk still failing after a reload', { url });
        return;
      }
      sessionStorage.setItem(PRELOAD_RETRY_KEY, '1');
      if (url) {
        recordFailure(url);
      }
      // Vite rethrows the error unless the event is cancelled, and the reload is the recovery.
      event.preventDefault();
      reload();
    } catch (error) {
      // Storage unavailable: no loop guard to reload behind, so let the error surface instead.
      log.catch(error);
    }
  });
};
