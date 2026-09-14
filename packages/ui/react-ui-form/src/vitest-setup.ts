//
// Copyright 2025 DXOS.org
//

// https://github.com/testing-library/jest-dom#with-vitest
import '@testing-library/jest-dom/vitest';

// https://github.com/jsdom/jsdom/issues/3368#issuecomment-1396749033
import ResizeObserver from 'resize-observer-polyfill';

global.ResizeObserver = ResizeObserver;

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
