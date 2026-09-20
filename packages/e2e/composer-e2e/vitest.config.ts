//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config.ts';

// `vitest.config.ts` via `createConfig`, matching the sibling e2e packages (`halo-e2e`,
// `teleport-e2e`), NOT a `vite.config.ts`: this package builds nothing, and a vite config makes
// knip resolve the workspace through its vite plugin, which loses every import the specs make.
//
// Node only, and the only vitest suite here: the specs are Playwright's, run by the `e2e` task
// against a real browser. What vitest covers is `report.ts` — the pure mapping from a Playwright
// JSON report to PostHog events, which has no browser in it.
export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
});
