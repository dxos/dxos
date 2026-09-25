//
// Copyright 2026 DXOS.org
//

import { STORY_MISSING } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';

/**
 * Recovers a story whose module graph was pulled out from under it.
 *
 * Vite's dependency optimizer re-runs whenever it meets a dep it has not pre-bundled — during an
 * editing session, typically the moment a new `import` is typed — and every module URL it had
 * already issued is invalidated at that instant. A request in flight then rejects with "Failed to
 * fetch dynamically imported module" and the iframe stays blank until someone reloads it by hand.
 *
 * `optimizeDeps.ignoreOutdatedRequests` (see `main.ts`) covers the pre-bundled `deps/*` half of
 * this. A story's own `?t=<timestamp>` source URL can still lose the race, and Storybook swallows
 * that rejection — it reaches neither `window` nor its own error events, surfacing only as
 * `STORY_MISSING`. Hence the index check below rather than an error listener.
 */

/** Message fragments every browser uses when a dynamic import's module request fails. */
const RECOVERABLE = [
  'failed to fetch dynamically imported module',
  'failed to load module script',
  'error loading dynamically imported module',
  'importing a module script failed',
];

/** Reloads allowed inside `WINDOW_MS`, above which the failure is the code's fault, not the optimizer's. */
const MAX_RELOADS = 2;
const WINDOW_MS = 30_000;
const STORAGE_KEY = 'dx.storybook.selfHeal';

/** Marks the listeners as attached, so an HMR re-evaluation does not stack a second set. */
const INSTALLED_KEY = '__dxStorybookSelfHealInstalled';

/**
 * Reload budget, kept in `sessionStorage` so it survives the reload it is counting. A story broken
 * for its own reasons therefore reloads twice and then stays put with its error on screen, rather
 * than looping.
 */
const consumeReloadBudget = (): boolean => {
  let stamps: unknown;
  try {
    stamps = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    stamps = [];
  }
  const now = Date.now();
  const recent = (Array.isArray(stamps) ? stamps : []).filter(
    (stamp: unknown) => typeof stamp === 'number' && now - stamp < WINDOW_MS,
  );
  if (recent.length >= MAX_RELOADS) {
    return false;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...recent, now]));
  } catch {
    // Without storage there is no way to bound the loop, so decline rather than risk one.
    return false;
  }
  return true;
};

const reload = (reason: string): void => {
  if (!consumeReloadBudget()) {
    console.warn(`[dxos] Story kept failing to load; not reloading again.\n${reason}`);
    return;
  }
  console.warn(`[dxos] Story module went stale (dependency re-optimize); reloading.\n${reason}`);
  window.location.reload();
};

const healIfRecoverable = (message: string): void => {
  const lower = message.toLowerCase();
  if (RECOVERABLE.some((fragment) => lower.includes(fragment))) {
    reload(message);
  }
};

/**
 * Storybook reports a story as missing both when the id does not exist and when its module failed
 * to load; only the latter is worth reloading, and the index is what tells them apart.
 */
const onStoryMissing = async (storyId: string): Promise<void> => {
  try {
    const index = await (await fetch('./index.json')).json();
    // An own-property check, since a hand-typed `?id=toString` would otherwise find
    // `Object.prototype`'s member and spend the reload budget on a URL that was never a story.
    if (!index?.entries || !Object.hasOwn(index.entries, storyId)) {
      return;
    }
  } catch {
    return;
  }
  reload(`Story "${storyId}" is indexed but its module did not load.`);
};

export const installSelfHeal = (): void => {
  // Never under browser-mode vitest, where a reload would sever the harness's connection. Elsewhere
  // the budget below is the only guard needed: a built Storybook has no optimizer to race, and there
  // a story that is indexed but will not load is a stale chunk, which reloading also fixes.
  if (typeof window === 'undefined' || '__vitest_browser_runner__' in window) {
    return;
  }

  // Storybook re-evaluates the preview annotations on HMR, which would stack a second set of
  // listeners; each one spends its own slot, so a single failure would drain the budget below. The
  // flag lives on `window` because the module itself is re-instantiated by that same HMR pass.
  if (INSTALLED_KEY in window) {
    return;
  }
  Object.defineProperty(window, INSTALLED_KEY, { value: true, configurable: true });

  // The channel does not exist yet while preview annotations are evaluating.
  void addons.ready().then(
    (channel) => channel.on(STORY_MISSING, onStoryMissing),
    (error) => console.warn('[dxos] Self-heal could not attach to the Storybook channel.', error),
  );

  // Nets for the failures that do reach the page rather than being swallowed by Storybook.
  window.addEventListener('unhandledrejection', (event) =>
    healIfRecoverable(String(event.reason?.message ?? event.reason ?? '')),
  );
  window.addEventListener('error', (event) => healIfRecoverable(String(event.message ?? '')));
  window.addEventListener('vite:preloadError', () => reload('Vite reported a preload failure.'));
};
