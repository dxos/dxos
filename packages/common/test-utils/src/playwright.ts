//
// Copyright 2023 DXOS.org
//

/* eslint-disable no-console */

import { type Browser, type BrowserContext, type Page, type PlaywrightTestConfig, devices } from '@playwright/test';
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

/**
 * Launch overrides for the Claude Code cloud sandbox, where the image ships a single Chromium build
 * that rarely matches the revision Playwright pins, and outbound HTTPS is only reachable through a
 * local proxy that resets Chromium's TLS 1.3 ClientHello.
 */
const sandboxUse = (): PlaywrightTestConfig['use'] => {
  if (!process.env.CLAUDE_CODE_REMOTE) {
    return {};
  }

  return {
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium',
      args: ['--no-sandbox', '--ssl-version-max=tls1.2', '--proxy-bypass-list=127.0.0.1;localhost'],
      proxy: { server: 'http://127.0.0.1:34301', bypass: '127.0.0.1,localhost' },
    },
  };
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
  const projects = [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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
    // Retry on CI to ride out the residual d&d / startup flakes while the
    // underlying causes are still being chased. Local runs stay strict so
    // flakes are visible while iterating.
    retries: process.env.CI ? 2 : 0,
    // Opt out of parallel tests on CI.
    workers: process.env.CI ? 1 : 4,
    // Reporter to use. See https://playwright.dev/docs/test-reporters.
    reporter: process.env.CI
      ? [
          ['list'],
          [
            'json',
            {
              outputFile: reporterOutputFile,
            },
          ],
          ['junit', { outputFile: reporterOutputFile.replace(/\.json$/, '.xml') }],
        ]
      : [['list']],
    use: {
      trace: 'retain-on-failure',
      // Playwright's default is no limit, so a stuck locator would absorb the whole per-test budget and
      // report a bare `Test timeout` naming nothing.
      actionTimeout: 30_000,
      ...sandboxUse(),
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
