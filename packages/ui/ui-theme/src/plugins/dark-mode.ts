//
// Copyright 2026 DXOS.org
//

// @ts-nocheck - This file is injected as a raw JS string into <head> by ThemePlugin (readFileSync).
// It runs in the browser, not Node.js — browser globals (window, document) are intentional.
// Must remain valid JavaScript (no TypeScript-specific syntax).

// Applies the .dark class to <html> synchronously before any other scripts run so that the
// critical CSS html.dark rules take effect on the very first paint. Continues to track changes.
// NOTE: Theme switching may be overridden in Chrome via:
//   chrome://settings/appearance and chrome://flags/#enable-force-dark
(() => {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = (dark) => {
    document.documentElement.classList[dark ? 'add' : 'remove']('dark');
  };
  applyTheme(query.matches);
  query.addEventListener('change', (event) => {
    applyTheme(event.matches);
  });
})();
