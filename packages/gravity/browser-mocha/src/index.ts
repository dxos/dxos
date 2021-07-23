//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { promises as fs } from 'fs';
import glob from 'glob';
import { join } from 'path';
import { promisify } from 'util';

import { buildTests } from './build';
import { runTests } from './run';
import { runSetup } from './run-setup';

export enum Browser {
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit',
}

export interface RunOptions {
  /**
   * Globs to look for files.
   */
  files: string[]
  browsers: Browser[]
  headless: boolean
  stayOpen: boolean
  setup?: string
  debug?: boolean,
  browserArgs?: string[]
}

export async function run (options: RunOptions) {
  if (options.setup) {
    await runSetup(options.setup);
  }

  const tempDir = 'dist/browser-mocha';
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (e) {
    console.error(e);
  }

  const files = await resolveFiles(options.files);

  await buildTests(files, tempDir, !!options.debug);

  let shouldFail = false;
  for (const browser of options.browsers) {
    console.log(chalk`\n\nRunning in {blue {bold ${browser}}}\n\n`);

    const exitCode = await runTests(join(tempDir, 'bundle.js'), browser, options);

    if (exitCode !== 0) {
      console.log(chalk`\n\n{red Failed with exit code ${exitCode} in {blue {bold ${browser}}}}\n\n`);
    } else {
      console.log(chalk`\n\n{green Passed in {blue {bold ${browser}}}}\n\n`);
    }

    if (!options.stayOpen) {
      shouldFail ||= (exitCode !== 0);
    } else {
      console.log(`\nCompleted with exit code ${exitCode}. Browser window stays open.`);
    }
  }

  process.exit(shouldFail ? 1 : 0);
}

async function resolveFiles (globs: string[]): Promise<string[]> {
  const results = await Promise.all(globs.map(pattern => promisify(glob)(pattern)));
  return Array.from(new Set(results.flat(1)));
}
