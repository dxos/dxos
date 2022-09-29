//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import glob from 'glob';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { buildTests, runTests } from './browser';
import { runSetup } from './util';

export type Browser =
  'chromium' |
  'firefox' |
  'webkit'

export type BrowserOptions = {
  testPatterns: string[]
  timeout: number
  signalServer: boolean
  setup?: string
  stayOpen: boolean
  headless: boolean
  checkLeaks: boolean
  debug: boolean
  browserArgs?: string[]
}

export const runBrowser = async (browser: Browser, options: BrowserOptions) => {
  if (options.setup) {
    await runSetup([options.setup]);
  }

  const tempDir = 'dist/browser-mocha';
  try {
    await mkdir(tempDir, { recursive: true });
  } catch (e: any) {
    console.error(e);
  }

  const files = await resolveFiles(options.testPatterns);
  await buildTests(files, { debug: !!options.debug, outDir: tempDir, checkLeaks: options.checkLeaks });

  console.log(chalk`\n\nRunning in {blue {bold ${browser}}}\n\n`);

  const exitCode = await runTests(join(tempDir, 'bundle.js'), browser, options);
  if (exitCode !== 0) {
    console.log(chalk`\n\n{red Failed with exit code ${exitCode} in {blue {bold ${browser}}}}\n\n`);
  } else {
    console.log(chalk`\n\n{green Passed in {blue {bold ${browser}}}}\n\n`);
  }

  const shouldFail = (exitCode !== 0);

  if (options.stayOpen) {
    console.log(`\nCompleted with ${shouldFail ? 'failure' : 'success'}. Browser window stays open.`);
    await new Promise(() => {}); // Sleep forever.
  }

  return !shouldFail;
};

const resolveFiles = async (globs: string[]): Promise<string[]> => {
  const results = await Promise.all(globs.map(pattern => promisify(glob)(pattern)));
  return Array.from(new Set(results.flat(1)));
};
