//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';
import { Page } from 'playwright';

import { Lock, trigger } from '../util';
import { BrowserType } from './browser';

export type RunTestsOptions = {
  debug: boolean
}

/**
 * Timeout for testing framework to initialize and to load tests.
 */
const INIT_TIMEOUT = 10_000;

export const runTests = async (
  page: Page,
  browserType: BrowserType,
  bundleFile: string,
  options: RunTestsOptions
): Promise<number> => {
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

  await page.exposeFunction('browserMocha__getEnv', () => ({ browserType }));

  await page.addScriptTag({
    path: bundleFile
  });

  return getPromise();
};
