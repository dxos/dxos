//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

import { e2ePreset } from '@dxos/test-utils/playwright';

import { HARNESS_PORT } from './stress-harness-server.ts';

const preset = e2ePreset(import.meta.dirname);

/**
 * Manually-run stress suite. Its own config (and its own moon task, `e2e-stress`) rather than the
 * shared `e2e` tag: the suite deliberately wedges workers and recycles tabs, so a run takes minutes
 * and is not something a PR should gate on.
 */
export default defineConfig({
  ...preset,
  webServer: {
    command: `pnpm exec vite dev --config src/playwright/harness/vite.config.ts --port ${HARNESS_PORT}`,
    // Playwright defaults `cwd` to the config's own directory, which is two levels below the package
    // root the command's paths are written against.
    cwd: resolve(import.meta.dirname, '../..'),
    // Above Playwright's 60s default: the first launch of a run pays vite's cold dependency
    // optimization, which a loaded machine can drag out past a minute.
    timeout: 180_000,
    // Probed by url, not port: vite binds the socket before it can serve, and a bare TCP probe
    // satisfied in that gap hands the first test an ERR_CONNECTION_REFUSED.
    url: `http://localhost:${HARNESS_PORT}`,
    reuseExistingServer: false,
  },
  // Chromium only: the suite turns on Web Locks steal semantics, SharedWorker, and timing-sensitive
  // failover — the other engines would each need their own budgets to mean anything.
  projects: preset.projects?.filter((project) => project.name === 'chromium'),
  // Every test drives one shared browser context full of tabs; two in parallel would elect leaders
  // against each other.
  workers: 1,
  fullyParallel: false,
  // Per-test budgets are set in the spec (`test.setTimeout`), sized from the iteration count.
  timeout: 600_000,
});
