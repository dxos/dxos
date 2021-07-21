//
// Copyright 2021 DXOS.org
//

import { assert } from 'console';
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
  stayOpen?: boolean
  setup?: string
  debug?: boolean,
  browserArgs?: string[]
}

export async function run (options: RunOptions) {
  assert(options.browsers.length === 1 && options.browsers[0] === Browser.CHROMIUM, 'Only chromium is supported.');

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
  const exitCode = await runTests(join(tempDir, 'bundle.js'), options);
  if (!options.stayOpen) {
    process.exit(exitCode);
  } else {
    console.log(`\nCompleted with exit code ${exitCode}. Browser window stays open.`);
  }
}

async function resolveFiles (globs: string[]): Promise<string[]> {
  const results = await Promise.all(globs.map(pattern => promisify(glob)(pattern)));
  return Array.from(new Set(results.flat(1)));
}
