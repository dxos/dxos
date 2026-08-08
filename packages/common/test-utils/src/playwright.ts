//
// Copyright 2023 DXOS.org
//

/* eslint-disable no-console */

import {
  type Browser,
  type BrowserContext,
  type Page,
  type PlaywrightTestConfig,
  type ReporterDescription,
  devices,
} from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import pkgUp from 'pkg-up';

import { Lock } from './lock';

const findWorkspaceRoot = (startDir: string): string => {
  let dir = resolve(startDir);
  while (dir !== '/') {
    try {
      // Check for pnpm-workspace.yaml first (modern pnpm approach)
      const workspaceYamlPath = join(dir, 'pnpm-workspace.yaml');
      if (existsSync(workspaceYamlPath)) {
        return dir;
      }

      // Check for package.json with workspaces field (legacy approach)
      const pkgPath = join(dir, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.workspaces) {
        return dir;
      }
    } catch {}
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error('Could not find pnpm workspace root');
};

export const e2ePreset = (testDir: string): PlaywrightTestConfig => {
  const packageJson = pkgUp.sync({ cwd: testDir });
  const packageDir = packageJson!.split('/').slice(0, -1).join('/');
  const packageDirName = packageDir.split('/').pop();
  if (!packageDirName) {
    throw new Error('packageDirName not found');
  }

  const workspaceRoot = findWorkspaceRoot(packageDir);
  const testResultOuputDir = join(workspaceRoot, 'test-results/playwright/output', packageDirName);
  const reporterOutputFile = join(workspaceRoot, 'test-results/playwright/report', `${packageDirName}.json`);

  const browser = process.env.PLAYWRIGHT_BROWSER || (process.env.CI ? 'all' : 'chromium');
  // In the Claude Code cloud sandbox chromium needs three launch fixes (see the cloud-sandbox
  // skill): the pinned executable (the image ships an older build than Playwright's pin, which
  // otherwise refuses to launch), the egress proxy via ARGS — Playwright's `proxy:` option drops
  // its bypass list for pages in a non-default context, sending the app's own localhost URL
  // through the proxy — and a TLS 1.2 cap (the proxy resets chromium's TLS 1.3 ClientHello).
  // Gated so real dev and CI runs are never silently downgraded; firefox/webkit need nothing.
  const sandboxProxy = process.env.CLAUDE_CODE_REMOTE ? process.env.HTTPS_PROXY : undefined;
  const sandboxChromium = sandboxProxy
    ? {
        launchOptions: {
          executablePath: '/opt/pw-browsers/chromium',
          args: [
            '--no-sandbox',
            `--proxy-server=${sandboxProxy}`,
            '--proxy-bypass-list=127.0.0.1;localhost',
            '--ssl-version-max=tls1.2',
          ],
        },
      }
    : {};
  const projects = [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...sandboxChromium },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ].filter((project) => {
    return browser === 'all' || project.name === browser;
  });

  return {
    testDir,
    outputDir: testResultOuputDir,
    // Playwright's default is 30s, which equals the action bound below — leaving a test no budget beyond
    // a single slow action. Storybook-backed suites also pay an on-demand story compile in the first
    // test's `beforeEach`, which alone exceeded 30s. Individual configs may still raise this.
    timeout: 60_000,
    // Run tests in files in parallel.
    fullyParallel: true,
    // Fail the build on CI if you accidentally left test.only in the source code.
    forbidOnly: !!process.env.CI,
    // No retries anywhere. Retrying hid flakes behind a 3x time cost — three `inbox.spec.ts` tests
    // alone spent ~9 minutes of a shard failing three times each — which made shard timings
    // unusable for sizing the suite. A flake now fails loudly and gets skipped with a TODO until
    // it is fixed, so measured time reflects the tests that actually work.
    retries: 0,
    // CI runners have 8 vCPUs and every test pays a ~15s app boot, so one worker leaves most of the
    // machine idle. 4 was measured 2.6x faster than 1 and looked more stable — but that trial only
    // covered composer on firefox, where most specs skip, so it never exercised a suite with enough
    // live tests to contend. On chromium 4 workers starves shared setup: run 31109309594 put
    // composer's 36 chromium tests on a cell of their own and 6 failed, every one a 30s timeout
    // clicking `create-space-form`'s save button, reported "not stable"/"detached from the DOM".
    // Four concurrent ~15s app boots race the same render. `re-order collections` passed at 26s with
    // less concurrency and failed at 44s with more. The same signature appeared in plugin-kanban's
    // `waitUntilReady` and todomvc's WebRTC `beforeEach`, so 2 is the compromise: still parallel,
    // but under the point where boot contention turns into false failures.
    // `|| 2` rather than `??`: an env var set to the empty string is common in Actions and would
    // otherwise coerce to 0 workers. `PLAYWRIGHT_WORKERS` remains the escape hatch.
    workers: Number(process.env.PLAYWRIGHT_WORKERS) || 2,
    // Reporter to use. See https://playwright.dev/docs/test-reporters.
    reporter: [
      ...(process.env.CI
        ? ([
            ['list'],
            [
              'json',
              {
                outputFile: reporterOutputFile,
              },
            ],
            ['junit', { outputFile: reporterOutputFile.replace(/\.json$/, '.xml') }],
          ] satisfies ReporterDescription[])
        : ([['list']] satisfies ReporterDescription[])),
    ],
    use: {
      trace: 'retain-on-failure',
      // Playwright's default is no limit, so a stuck locator would absorb the whole per-test budget and
      // report a bare `Test timeout` naming nothing.
      actionTimeout: 30_000,
    },
    projects,
  };
};

export type SetupOptions = {
  url?: string;
  bridgeLogs?: boolean;
  viewportSize?: Parameters<Page['setViewportSize']>[0];
};

export const setupPage = async (browser: Browser | BrowserContext, options: SetupOptions = {}) => {
  const { url, bridgeLogs, viewportSize } = options;

  const context = 'newContext' in browser ? await browser.newContext() : browser;
  const page = await context.newPage();

  if (viewportSize) {
    await page.setViewportSize(viewportSize);
  }

  // TODO(wittjosiah): Remove?
  if (bridgeLogs) {
    const lock = new Lock();

    page.on('pageerror', async (error) => {
      await lock.executeSynchronized(async () => {
        // eslint-disable-next-line no-console
        console.log(error);
      });
    });

    page.on('console', async (msg) => {
      try {
        const argsPromise = Promise.all(msg.args().map((x) => x.jsonValue()));
        await lock.executeSynchronized(async () => {
          const args = await argsPromise;

          if (args.length > 0) {
            console.log(...args);
          } else {
            console.log(msg);
          }
        });
      } catch (err) {
        console.error('Failed to parse message', err);
      }
    });
  }

  if (url) {
    await page.goto(url);
  }

  return { context, page };
};

export const storybookUrl = (storyId: string, port = 9009) =>
  `http://localhost:${port}/iframe.html?id=${storyId}&viewMode=story`;
