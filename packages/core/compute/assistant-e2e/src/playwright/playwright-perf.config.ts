//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { e2ePreset } from '@dxos/test-utils/playwright';

import { PERF_PORT, PERF_STORYBOOK_OUT, SERVING_MODE } from './perf/server.ts';

const preset = e2ePreset(import.meta.dirname);

const STORYBOOK_DIR = path.resolve(import.meta.dirname, '../../../../../../tools/storybook-react');

// Without the build, the preview answers 404 and every stage would time out instead of saying why.
if (SERVING_MODE === 'preview' && !existsSync(path.join(STORYBOOK_DIR, PERF_STORYBOOK_OUT, 'iframe.html'))) {
  throw new Error(
    `No Storybook build at tools/storybook-react/${PERF_STORYBOOK_OUT}: run \`moon run storybook-react:bundle-perf\` (or \`moon run assistant-e2e:e2e-perf\`), or set DX_PERF_SERVER=dev.`,
  );
}

/**
 * Chat performance flow against the Storybook chat story, measured by `@dxos/perf-harness`.
 *
 * Served from a static `storybook build` by default (see `perf/server.ts`); `DX_PERF_SERVER=dev`
 * switches to `storybook dev`, whose numbers are not comparable with the build's.
 *
 * Pinned to one project because the harness launches its own instrumented Chromium whichever
 * project is active, so the other browsers would only rerun the same Chromium.
 */
export default defineConfig({
  ...preset,
  projects: preset.projects?.filter((project) => project.name === 'chromium'),
  testMatch: '**/perf-*.spec.ts',
  // Playwright's recorder snapshots the DOM on the page's main thread, which lands inside the stages.
  use: { ...preset.use, trace: 'off', video: 'off', screenshot: 'off' },
  timeout: 0,
  expect: { timeout: 30_000 },
  workers: 1,
  // Two flows measured at once would contend for the same cores and measure each other.
  fullyParallel: false,
  webServer:
    SERVING_MODE === 'dev'
      ? {
          // `cwd`, not a relative `--dir`: the command runs from this config's directory, not the package's.
          command: `pnpm exec storybook dev --port ${PERF_PORT} --no-open --ci`,
          cwd: STORYBOOK_DIR,
          port: PERF_PORT,
          reuseExistingServer: true,
          // A cold `storybook dev` on a fresh CI checkout pre-bundles the whole story graph before it answers.
          timeout: 600_000,
        }
      : {
          command: `pnpm exec vite preview --outDir ${PERF_STORYBOOK_OUT} --port ${PERF_PORT} --strictPort`,
          cwd: STORYBOOK_DIR,
          port: PERF_PORT,
          // The preview serves whatever is on disk, so a running one already reflects the latest build.
          reuseExistingServer: true,
          timeout: 60_000,
        },
});
