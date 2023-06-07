//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { parse, stringify } from 'comment-json';
import { readFile, writeFile } from 'node:fs/promises';

export const loadJson = async <T>(filename: string): Promise<T> => {
  try {
    const json = await readFile(filename, 'utf-8');
    return parse(json, undefined, false) as T;
  } catch (err) {
    console.error(err);
    throw new Error(`Invalid file: ${filename}`);
  }
};

export const saveJson = async (filepath: string, value: any, verbose = false) => {
  await writeFile(filepath, stringify(value, undefined, 2) + '\n', 'utf-8');
  if (verbose) {
    console.log(`Updated: ${chalk.green(filepath)}`);
  }
};
