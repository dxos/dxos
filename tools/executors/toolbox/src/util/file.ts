//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { parse } from 'comment-json';
import { readFile, writeFile } from 'node:fs/promises';

// TODO(burdon): Generalize into template builder.
export const loadJson = async <T>(filename: string, throwOnError = true): Promise<T | undefined> => {
  try {
    const json = await readFile(filename, 'utf-8');
    return parse(json, undefined, true) as T;
  } catch (err) {
    if (throwOnError) {
      throw new Error(`Failed to process: ${filename} [${err}]`);
    }

    return undefined;
  }
};

export const saveJson = async (filepath: string, value: any) => {
  await writeFile(filepath, JSON.stringify(value, undefined, 2) + '\n', 'utf-8');
  console.log(`Updated: ${chalk.green(filepath)}`);
};
