import glob from 'glob'
import { join } from 'path';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { buildTests } from './build';
import { runTests } from './run';
import { assert } from 'console';

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
}

export async function run(options: RunOptions) {
  assert(options.browsers.length === 1 && options.browsers[0] === Browser.CHROMIUM, 'Only chromium is supported.')

  const tempDir = 'dist/browser-tests'
  try {
    await fs.mkdir('dist')
    await fs.mkdir(tempDir)
  } catch{}

  const files = await resolveFiles(options.files);

  await buildTests(files, tempDir)
  const exitCode = await runTests(join(tempDir, 'bundle.js'))
  process.exit(exitCode)
}

async function resolveFiles(globs: string[]): Promise<string[]> {
  const results = await Promise.all(globs.map(pattern => promisify(glob)(pattern)))
  return Array.from(new Set(results.flat(1)));
}
