//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  // Node only, and the only vitest suite here: the specs are Playwright's, run by the `e2e` task
  // against a real browser. What vitest covers is `report.ts` — the pure mapping from a Playwright
  // JSON report to PostHog events, which has no browser in it.
  test: { node: true },
});
