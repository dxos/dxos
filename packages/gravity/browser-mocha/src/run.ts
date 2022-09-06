//
// Copyright 2021 DXOS.org
//

import { promises as fs } from 'fs';
import assert from 'node:assert';
import { dirname, join } from 'path';
import pkgUp from 'pkg-up';
import { chromium, firefox, webkit } from 'playwright';
import { v4 } from 'uuid';

import { Lock, trigger } from '@dxos/async';

import { Browser, RunOptions } from './runner';

/**
 * Timeout for testing framework to initialize and to load tests.
 */
const INIT_TIMEOUT = 10_000;

export const runTests = async (bundleFile: string, browser: Browser, options: Omit<RunOptions, 'browsers' | 'files'>): Promise<number> => {
  const userDataDir = `/tmp/browser-mocha/${v4()}`;

  await fs.mkdir(userDataDir, { recursive: true });

  const browserRunner = getBrowser(browser);

  const context = await browserRunner.launchPersistentContext(
    userDataDir,
    {
      headless: options.headless,
      args: [
        ...options.debug ? ['--auto-open-devtools-for-tabs'] : [],
        ...options.browserArgs ?? []
      ]
    }
  );
  const page = await context.newPage();

  const lock = new Lock();

  page.on('pageerror', async (error) => {
    await lock.executeSynchronized(async () => {
      console.log(error);
    });
  });
  page.on('console', async msg => {
    const argsPromise = Promise.all(msg.args().map(x => x.jsonValue()));
    await lock.executeSynchronized(async () => {
      const args = await argsPromise;
      if (args.length > 0) {
        console.log(...args);
      } else {
        console.log(msg);
      }
    });
  });

  const packageDir = dirname(await pkgUp({ cwd: __dirname }) as string);
  assert(packageDir);

  await page.goto(`file://${join(packageDir, './src/index.html')}`);

  const [getPromise, resolve] = trigger<number>();
  await page.exposeFunction('browserMocha__testsDone', async (exitCode: number) => {
    await lock.executeSynchronized(async () => {
      resolve(exitCode);
    });
  });

  const exitTimeout = setTimeout(() => {
    if (options.debug) {
      return;
    }

    console.log(`\n\nTests failed to load in ${INIT_TIMEOUT} ms.`);
    process.exit(-1);
  }, INIT_TIMEOUT);
  await page.exposeFunction('browserMocha__initFinished', () => {
    clearTimeout(exitTimeout);
  });

  await page.exposeFunction('browserMocha__getEnv', () => ({ browser }));

  await page.addScriptTag({
    path: bundleFile
  });

  return getPromise();
};

const getBrowser = (browser: Browser) => {
  switch (browser) {
    case Browser.CHROMIUM: return chromium;
    case Browser.FIREFOX: return firefox;
    case Browser.WEBKIT: return webkit;
    default: throw new Error(`Unsupported browser: ${browser}`);
  }
};
