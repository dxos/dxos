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
  // In the Claude Code cloud sandbox chromium needs a pinned executable, the egress proxy passed via
  // ARGS (Playwright's `proxy:` option drops its bypass list for non-default contexts), and a TLS 1.2
  // cap (see the cloud-sandbox skill). Gated so real dev/CI runs are never silently downgraded.
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
    // No retries anywhere: retrying hides flakes behind a 3x time cost, making shard timings unusable
    // for sizing the suite. A flake now fails loudly and gets skipped with a TODO instead.
    retries: 0,
    // 4 workers starved shared setup into false "not stable"/"detached" failures, so 2 is the
    // compromise. `|| 2`, not `??`: an env var set to the empty string (common in Actions) would
    // otherwise coerce to 0 workers.
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
  const ownsContext = context !== browser;
  const page = await context.newPage();

  // Closing the page is not enough. Playwright never reclaims a context created off the worker-scoped
  // `browser` fixture, and it opens a trace chunk on every LIVE context when a test starts, so each
  // leaked context is re-serialized into every later trace in that worker until the writer exceeds
  // V8's string limit and the run reports `RangeError: Invalid string length` over a truncated
  // trace.zip instead of the failure it was recording.
  const close = async (): Promise<void> => {
    await (ownsContext ? context.close() : page.close());
  };

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

  return { context, page, close };
};

export const storybookUrl = (storyId: string, port = 9009) =>
  `http://localhost:${port}/iframe.html?id=${storyId}&viewMode=story`;

/**
 * Playwright `webServer` for a Storybook-backed suite. Readiness is probed by `url` rather than
 * `port` because a `port` probe is a bare TCP check, which `storybook dev` satisfies by binding the
 * socket before it can serve — tests starting in that gap get ERR_CONNECTION_REFUSED.
 */
export const storybookWebServer = (port: number) => ({
  command: `pnpm storybook dev --ci --quiet --port=${port} --config-dir=.storybook`,
  url: `http://localhost:${port}`,
  reuseExistingServer: false,
});
