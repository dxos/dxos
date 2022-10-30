//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { parse } from 'comment-json';
import { readFile, writeFile } from 'node:fs/promises';

// TODO(burdon): Generalize into template builder.
export const loadJson = async <T>(filename: string, defaultValue?: T): Promise<T> => {
  const json = await readFile(filename, 'utf-8');
  if (!json) {
    if (!defaultValue) {
      throw new Error(`Invalid file: ${filename}`);
    }

    return defaultValue;
  }

  return parse(json, undefined, true) as T;
};

export const saveJson = async (filepath: string, value: any) => {
  await writeFile(filepath, JSON.stringify(value, undefined, 2) + '\n', 'utf-8');
  console.log(`Updated: ${chalk.green(filepath)}`);
};
