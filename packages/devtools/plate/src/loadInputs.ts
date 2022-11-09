import yaml from 'yaml';
import merge from 'lodash.merge';
import { promises as fs } from 'fs';
import path from 'path';

export type LoadOptions = {
  relativeTo?: string;
};

export const loadInputs = async (fileNames: string[], options?: LoadOptions): Promise<object> => {
  const { relativeTo } = { ...options };
  if (!fileNames) return {};
  const load = async (file: string) => {
    if (!file) return {};
    const isYaml = /\.ya?ml$/.test(file);
    const isJSON = /\.json$/.test(file);
    const content = (await fs.readFile(relativeTo ? path.resolve(relativeTo, file) : file)).toString();
    return isYaml
      ? yaml.parse(content)
      : isJSON
      ? JSON.parse(content)
      : {
          error: `invalid file type ${file}`
        };
  };
  const loadedParts = await Promise.all(fileNames.map(load));
  return loadedParts.reduce((memo, next) => merge(memo, next), {});
};
