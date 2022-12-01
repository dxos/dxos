//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';
import merge from 'lodash.merge';
import path from 'path';
import yaml from 'yaml';

export type LoadOptions = {
  relativeTo?: string;
};

export const loadInputs = async (fileNames: string[], options?: LoadOptions): Promise<object> => {
  const { relativeTo } = { ...options };
  if (!fileNames) {
    return {};
  }
  const errors: any[] = [];
  const load = async (file: string) => {
    if (!file) {
      return {};
    }
    const isYaml = /\.ya?ml$/.test(file);
    const isJSON = /\.json$/.test(file);
    try {
      const content = (await fs.readFile(relativeTo ? path.resolve(relativeTo, file) : file)).toString();
      return isYaml ? yaml.parse(content) : isJSON ? JSON.parse(content) : undefined;
    } catch (err) {
      errors.push(err);
    }
  };
  const loadedParts = await Promise.all(fileNames.map(load));
  const squashed = loadedParts.reduce((memo, next) => merge(memo, next), {});
  if (Object.keys(squashed).length < 1) {
    throw new Error(
      [`unable to load inputs from ${fileNames.join(', ')}`, ...errors?.map((e) => e.toString())].join('\n')
    );
  }
  return squashed;
};
