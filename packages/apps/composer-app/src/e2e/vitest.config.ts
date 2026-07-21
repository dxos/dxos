//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));
// CI's analytics uploader collects junit files from this shared directory.
const junitFile = path.join(dirname, '../../../../..', 'test-results/playwright/report/composer-app.xml');

/**
 * Production e2e suite — Stagehand-driven browser tests against `vite preview`.
 *
 *   DX_PWA=false moon run composer-app:e2e
 *
 * Set STAGEHAND_HEADED=1 to watch the browser, and STAGEHAND_MODEL (plus the provider
 * API key, e.g. ANTHROPIC_API_KEY) to enable AI-driven act/extract/observe steps.
 */
export default defineConfig({
  test: {
    name: 'e2e',
    environment: 'node',
    include: ['src/e2e/*.spec.ts'],
    exclude: ['src/e2e/dev-startup.spec.ts', 'src/e2e/welcome-focus.spec.ts'],
    globalSetup: ['src/e2e/setup/preview-server.ts'],
    // Plain-language steps are model calls; tests and hooks run minutes, not seconds.
    // Sized ~2x the median single-peer test (median ~70s) — the typical case, not the
    // slowest — since a global sized for the outlier just masks regressions everywhere
    // else. Tests that genuinely need longer carry their own `{ timeout }`: the
    // multi-peer suites (collaboration, halo) at the suite level, and the "reset device"
    // test (full reload + identity re-create) inline. Concurrency raises per-test time
    // via CPU/API contention, so this keeps ~2x headroom over the median at maxWorkers.
    testTimeout: 150_000,
    hookTimeout: 150_000,
    // Steps are I/O-bound (model calls), so files run concurrently to win back wall-clock;
    // each worker drives one or two chromium instances (multi-peer files drive two). The
    // binding constraint is CPU during the simultaneous cold-boot phase, not RAM or API
    // rate: booting several heavy Composer instances at once (shared workers + WASM + a
    // ~40MB bundle each) saturates the host, and beforeEach's `createPeer` boot then blows
    // the hook timeout. Measured on a 14-core/36GB machine, 4 workers mass-times-out on
    // boot; 2 is the proven default. Tune with DX_E2E_WORKERS to your host.
    fileParallelism: true,
    maxWorkers: Number(process.env.DX_E2E_WORKERS ?? 2),
    // No retries anywhere: a flaky test should fail visibly so the flake rate of the
    // AI-driven suite stays measurable.
    reporters: process.env.CI ? [['default'], ['junit', { outputFile: junitFile }]] : [['default']],
  },
});
