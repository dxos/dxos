//
// Copyright 2025 DXOS.org
//

// https://github.com/testing-library/jest-dom#with-vitest
import '@testing-library/jest-dom/vitest';

// https://github.com/jsdom/jsdom/issues/3368#issuecomment-1396749033
import ResizeObserver from 'resize-observer-polyfill';
import { disposeTabster, getTabster } from 'tabster';
import { afterEach } from 'vitest';

global.ResizeObserver = ResizeObserver;

// Tabster (used by `useListNavigation` inside `OrderedList` / `Listbox`) lazy-installs a
// `DummyInputManagerCore` refresh timer. After happy-dom tears down the per-file
// environment, the `Node` DOM global is gone — if the timer fires in that window the
// callback crashes with `ReferenceError: Node is not defined`. The 48 tests themselves
// always pass; the error is purely a post-teardown race.
//
// Two complementary mitigations:
//   1. `afterEach` disposes any active Tabster instance so its pending timers are cleared
//      while the DOM is still alive.
//   2. A targeted `process` listener swallows the specific ReferenceError when it slips
//      through (e.g. Tabster instance attached to a window we can't recover post-teardown).
//      The listener is registered once via a process-level flag so re-running setup across
//      test files doesn't pile up handlers.

afterEach(() => {
  if (typeof globalThis.window === 'undefined') {
    return;
  }
  const instance = getTabster(globalThis.window);
  if (instance) {
    disposeTabster(instance);
  }
});

// `ThemeProvider`'s icon registry fetches the static sprite (`/icons.svg`) and any missing glyph
// (`/phosphor/…`) from the document origin. happy-dom points that origin at `http://localhost:3000`,
// where nothing listens, so every request opens a real socket and dies with `ECONNREFUSED` —
// and since the registry treats a network error as transient, each re-render retries forever.
// Answering 404 marks the symbol permanently missing, which is the truth in a test environment.
const ICON_ROUTES = ['/icons.svg', '/phosphor/'];

const FETCH_FLAG = '__dxos_icon_fetch_stub__';
if (!(globalThis as Record<string, unknown>)[FETCH_FLAG] && typeof globalThis.fetch === 'function') {
  (globalThis as Record<string, unknown>)[FETCH_FLAG] = true;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const { pathname } = new URL(url, globalThis.location?.href);
    if (ICON_ROUTES.some((route) => pathname.startsWith(route))) {
      return Promise.resolve(new Response(null, { status: 404, statusText: 'Not Found' }));
    }
    return originalFetch(input, init);
  };
}

const FLAG = '__dxos_tabster_post_teardown_filter__';
if (!(globalThis as Record<string, unknown>)[FLAG]) {
  (globalThis as Record<string, unknown>)[FLAG] = true;
  const handler = (err: unknown) => {
    if (err instanceof ReferenceError && err.message === 'Node is not defined') {
      // Swallow — see comment above.
      return;
    }
    throw err;
  };
  process.on('uncaughtException', handler);
  process.on('unhandledRejection', handler);
}
