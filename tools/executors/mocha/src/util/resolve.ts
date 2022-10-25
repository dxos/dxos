//
// Copyright 2022 DXOS.org
//

import glob from 'glob';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

/**
 * Resolves a list of globs to a list of files as a tuple of [filename, contents].
 */
export const resolveFiles = async (
  globs: string[]
): Promise<[string, string][]> => {
  const results = await Promise.all(
    globs.map((pattern) => promisify(glob)(pattern))
  );
  const filenames = Array.from(new Set(results.flat()));
  const files = await Promise.all(
    filenames.map(
      async (filename): Promise<[string, string]> => [
        filename,
        await readFile(filename, 'utf-8')
      ]
    )
  );

  return files;
};
