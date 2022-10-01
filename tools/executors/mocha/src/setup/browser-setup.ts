//
// Copyright 2022 DXOS.org
//

import glob from 'glob';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { buildTests } from '../browser';
import { MochaExecutorOptions } from '../main';

const resolveFiles = async (globs: string[]): Promise<string[]> => {
  const results = await Promise.all(globs.map(pattern => promisify(glob)(pattern)));
  return Array.from(new Set(results.flat(1)));
};

export const setup = async (options: MochaExecutorOptions) => {
  const outDir = join(options.outputPath, 'out');

  try {
    await mkdir(outDir, { recursive: true });
  } catch (e: any) {
    console.error(e);
  }

  const files = await resolveFiles(options.testPatterns);

  await buildTests(files, {
    debug: !!options.debug,
    outDir,
    checkLeaks: options.checkLeaks
  });
};
