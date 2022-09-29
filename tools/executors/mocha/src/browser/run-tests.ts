//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';
import { chromium, firefox, webkit } from 'playwright';
import { v4 } from 'uuid';

import { Browser, BrowserOptions } from '../run-browser';
import { Lock, trigger } from '../util';

/**
 * Timeout for testing framework to initialize and to load tests.
 */
const INIT_TIMEOUT = 10_000;

export const runTests = async (bundleFile: string, browser: Browser, options: BrowserOptions): Promise<number> => {
  const userDataDir = `/tmp/browser-mocha/${v4()}`;
  await mkdir(userDataDir, { recursive: true });

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
  await page.goto(`file://${join(packageDir, './src/browser/index.html')}`);

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
    case 'chromium': return chromium;
    case 'firefox': return firefox;
    case 'webkit': return webkit;
    default: throw new Error(`Unsupported browser: ${browser}`);
  }
};
