//
// Copyright 2023 DXOS.org
//

/* eslint-disable no-console */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { type Browser, type BrowserContext, type Page, type PlaywrightTestConfig, devices } from '@playwright/test';
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
    // Run tests in files in parallel.
    fullyParallel: true,
    // Fail the build on CI if you accidentally left test.only in the source code.
    forbidOnly: !!process.env.CI,
    // Retry on CI only.
    retries: process.env.CI ? 2 : 0,
    // Opt out of parallel tests on CI.
    workers: process.env.CI ? 1 : undefined,
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
        ]
      : [['list']],
    use: {
      trace: 'retain-on-failure',
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
