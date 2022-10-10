//
// Copyright 2021 DXOS.org
//

import get from 'lodash.get';
import set from 'lodash.set';
import { Stats } from 'mocha';
import assert from 'node:assert';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';
import { Page } from 'playwright';

import { Lock, trigger } from '../util/index.js';
import { BrowserType } from './browser.js';
import { TestResult } from './reporter.js';

export type RunTestsOptions = {
  debug: boolean
}

export type Suites = {
  suites?: {
    [key: string]: Suites
  }
  tests: TestResult[]
}

export type TestError = {
  suite: string[]
  test: string
  message: string
  stack: string
}

export type SuitesWithErrors = Suites & {
  errors: TestError[]
}

export type RunTestsResults = {
  suites: SuitesWithErrors
  stats: Stats
}

/**
 * Timeout for testing framework to initialize and to load tests.
 */
const INIT_TIMEOUT = 10_000;

const parseTestResult = ([arg]: any[]) => {
  try {
    const result = JSON.parse(arg);
    if (result.event === 'test end') {
      return result.test as TestResult;
    } else if (result.event === 'fail') {
      delete result.event;
      return result as TestError;
    } else if (result.event === 'end') {
      return result.stats as Stats;
    } else {
      return undefined;
    }
  } catch {
    return undefined;
  }
};

export const runTests = async (
  page: Page,
  browserType: BrowserType,
  bundleFile: string,
  options: RunTestsOptions
) => {
  let stats: Stats;
  const suites: SuitesWithErrors = { suites: {}, tests: [], errors: [] };
  const lock = new Lock();

  const handleResult = (result: TestResult | TestError | Stats) => {
    if ('title' in result) {
      const suiteSelector = result.suite
        .map(suite => ['suites', suite])
        .flat();
      suiteSelector.push('tests');
      const tests: TestResult[] = get(suites, suiteSelector) ?? [];
      set(suites, suiteSelector, [...tests, result]);
    } else if ('stack' in result) {
      suites.errors.push(result);
    } else {
      stats = result;
    }
  };

  page.on('pageerror', async (error) => {
    await lock.executeSynchronized(async () => {
      console.log(error);
    });
  });

  page.on('console', async msg => {
    const argsPromise = Promise.all(msg.args().map(x => x.jsonValue()));
    await lock.executeSynchronized(async () => {
      const args = await argsPromise;

      const result = parseTestResult(args);
      if (result) {
        handleResult(result);
        return;
      }

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

  const [getPromise, resolve] = trigger<RunTestsResults>();
  await page.exposeFunction('browserMocha__testsDone', async (exitCode: number) => {
    await lock.executeSynchronized(async () => {
      resolve({ suites, stats });
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

  await page.addScriptTag({ path: bundleFile });

  return getPromise();
};
