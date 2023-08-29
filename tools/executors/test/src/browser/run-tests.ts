//
// Copyright 2021 DXOS.org
//

import { Page } from '@playwright/test';
import fs from 'fs';
import http from 'http';
import get from 'lodash.get';
import set from 'lodash.set';
import { Stats } from 'mocha';
import { AddressInfo } from 'net';
import assert from 'node:assert';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';

import { BrowserType } from '../types';
import { Lock, trigger } from '../util';
import { TestResult } from './reporter';

export type RunTestsOptions = {
  debug: boolean;
  worker: boolean
};

export type Suites = {
  suites?: {
    [key: string]: Suites;
  };
  tests: TestResult[];
};

export type TestError = {
  suite: string[];
  test: string;
  message: string;
  stack: string;
};

export type SuitesWithErrors = Suites & {
  errors: TestError[];
};

export type RunTestsResults = {
  suites: SuitesWithErrors;
  stats: Stats;
};

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

type BrowserApi = {
  browserMocha__testsDone?: (exitCode: number) => Promise<void>;
  browserMocha__initFinished?: () => Promise<void>;
  browserMocha__getEnv?: () => Promise<{ browserType: BrowserType }>;
}

export const runTests = async (page: Page, browserType: BrowserType, bundleFile: string, options: RunTestsOptions) => {
  let stats: Stats;
  const suites: SuitesWithErrors = { suites: {}, tests: [], errors: [] };
  const lock = new Lock();

  const handleResult = (result: TestResult | TestError | Stats) => {
    if ('title' in result) {
      const suiteSelector = result.suite.map((suite) => ['suites', suite]).flat();
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

  page.on('console', async (msg) => {
    const argsPromise = Promise.all(msg.args().map((x) => x.jsonValue()));
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

  const packageDir = dirname((await pkgUp({ cwd: __dirname })) as string);
  assert(packageDir);

  const server = await servePage(join(packageDir, './src/browser/index.html'));
  const port = (server.address() as AddressInfo).port;
  await page.goto(`http://localhost:${port}`);


  const [getPromise, resolve] = trigger<RunTestsResults>();

  const exitTimeout = setTimeout(() => {
    if (options.debug) {
      return;
    }

    console.log(`\n\nTests failed to load in ${INIT_TIMEOUT} ms.`);
    process.exit(-1);
  }, INIT_TIMEOUT);

  const api: BrowserApi = {
    browserMocha__testsDone: async (exitCode: number) => {
      await lock.executeSynchronized(async () => {
        resolve({ suites, stats });
      });
    },
    browserMocha__initFinished: async () => {
      clearTimeout(exitTimeout);
    },
    browserMocha__getEnv: async () => ({ browserType })
  }
  for (const [key, value] of Object.entries(api)) {
    await page.exposeFunction(key, value);
  }

  if (!options.worker) {
    await page.addScriptTag({ path: bundleFile });
  } else {
    const worker = await page.addScriptTag({
      type: 'text/js-worker',
      content: `(${() => {
        // WARN: This function is serialized and sent over to the browser. It must not reference any variables outside of its scope.
        globalThis.onmessage = async (event) => {
          const { bundleFile, apiMethods } = event.data;

          for (const method of apiMethods) {
            (globalThis as any)[method] = (...args: any[]) => new Promise((resolve, reject) => {
              const channel = new MessageChannel();

              channel.port1.onmessage = (event) => {
                const { error, result } = event.data;
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }

              globalThis.postMessage({ method, args, callback: channel.port2 }, [channel.port2] as any);
            });
          }

          importScripts(bundleFile);
        }
      }})();`
    })
    const workerBlob = await worker.evaluateHandle(element => new Blob([element.textContent!]))


    const tests = await page.addScriptTag({
      type: 'text/js-tests',
      path: bundleFile,
    })
    const testsBlob = await tests.evaluateHandle(element => new Blob([element.textContent!]))

    await page.evaluate(async ([workerBlob, testsBlob, apiMethods]) => {
      // WARN: This function is serialized and sent over to the browser. It must not reference any variables outside of its scope.

      const worker = new Worker(window.URL.createObjectURL(workerBlob));
      worker.onmessage = (event) => {
        const { method, args, callback } = event.data as { method: string, args: any, callback: MessagePort };

        (globalThis as any)[method](...args).then(
          (res: any) => {
            callback.postMessage({ result: res });
          },
          (err: any) => {
            callback.postMessage({ error: err });
          }
        )
      }
      worker.postMessage({ bundleFile: window.URL.createObjectURL(testsBlob), apiMethods })


    }, [workerBlob, testsBlob, Object.keys(api)] as const);
  }

  try {
    return await getPromise();
  } finally {
    server.close();
  }
};

const servePage = async (path: string, port = 5176) => {
  const server = http.createServer((req, res) => {
    const fileName = req.url === '/' ? path : req.url;
    if (!fileName) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    // Read the HTML file from disk
    fs.readFile(fileName, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  });

  let retries = 0;
  server.on('error', (err) => {
    if (err.message.includes('EADDRINUSE') && retries < 100) {
      retries++;
      server.close();
      server.listen(port++, () => {
        trigger();
      });
    } else {
      throw err;
    }
  });

  let trigger: () => void;
  const serverReady = new Promise<void>((resolve) => {
    trigger = resolve;
  });

  server.listen(port++, () => {
    trigger();
  });
  await serverReady;
  return server;
};
