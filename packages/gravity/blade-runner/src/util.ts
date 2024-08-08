//
// Copyright 2023 DXOS.org
//

import yaml from 'js-yaml';
import { readFile } from 'node:fs/promises';

export const randomArraySlice = <T>(array: T[], size: number) => {
  const result = [];
  const arrayCopy = [...array];
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * arrayCopy.length);
    result.push(arrayCopy[randomIndex]);
    arrayCopy.splice(randomIndex, 1);
  }
  return result;
};

export const readYAMLSpecFile = async <S>(path: string): Promise<S> => yaml.load(await readFile(path, 'utf8')) as S;
