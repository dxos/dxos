//
// Copyright 2023 DXOS.org
//

/* eslint-disable no-console */

import { workspaceRoot } from '@nx/devkit';
import { type Browser, type BrowserContext, type PlaywrightTestConfig } from '@playwright/test';
import { join, relative } from 'node:path';
import pkgUp from 'pkg-up';

import { Lock } from './lock';

export const e2ePreset = (cwd: string): PlaywrightTestConfig => {
  const packageJson = pkgUp.sync({ cwd });
  const packageDir = packageJson!.split('/').slice(0, -1).join('/');
  const packageDirRelative = relative(workspaceRoot, packageDir);
  const testResultsDir = join(workspaceRoot, 'test-results', packageDirRelative, 'results.xml');

  return {
    reporter: process.env.CI ? [['list'], ['junit', { outputFile: testResultsDir }]] : [['list']],
    use: {
      trace: 'retain-on-failure',
    },
  };
};

export type SetupOptions = {
  url?: string;
  bridgeLogs?: boolean;
};

export const setupPage = async (browser: Browser | BrowserContext, options: SetupOptions = {}) => {
  const { url, bridgeLogs } = options;

  const context = 'newContext' in browser ? await browser.newContext() : browser;
  const page = await context.newPage();

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
