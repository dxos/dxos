//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { promises as fs } from 'fs';
import glob from 'glob';
import { join } from 'path';
import { promisify } from 'util';

import { buildTests } from './build';
import { BrowserExecutorOptions } from './main';
import { runTests } from './run';
import { runSetup } from './run-setup';

export enum Browser {
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit',
}

export const run = async (options: BrowserExecutorOptions) => {
  if (options.setup) {
    await runSetup(options.setup);
  }

  const tempDir = 'dist/browser-mocha';
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (e: any) {
    console.error(e);
  }

  const files = await resolveFiles(options.testPatterns);

  await buildTests(files, { debug: !!options.debug, outDir: tempDir, checkLeaks: options.checkLeaks });

  let shouldFail = false;
  for (const browser of options.browsers) {
    console.log(chalk`\n\nRunning in {blue {bold ${browser}}}\n\n`);

    const exitCode = await runTests(join(tempDir, 'bundle.js'), browser, options);
    if (exitCode !== 0) {
      console.log(chalk`\n\n{red Failed with exit code ${exitCode} in {blue {bold ${browser}}}}\n\n`);
    } else {
      console.log(chalk`\n\n{green Passed in {blue {bold ${browser}}}}\n\n`);
    }

    shouldFail ||= (exitCode !== 0);
  }

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
