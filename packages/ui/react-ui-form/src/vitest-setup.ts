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
// dummy-input refresh timer that can fire after the happy-dom environment is torn down
// between test files — at which point `Node` is no longer on globalThis and the callback
// crashes with `ReferenceError: Node is not defined`. Dispose any active Tabster instance
// after each test so its pending timers run (or are cleared) while the DOM is still alive.
afterEach(() => {
  if (typeof globalThis.window === 'undefined') {
    return;
  }
  const instance = getTabster(globalThis.window);
  if (instance) {
    disposeTabster(instance);
  }
});
