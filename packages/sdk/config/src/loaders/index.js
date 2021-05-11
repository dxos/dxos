//
// Copyright 2020 DXOS.
//

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { mapFromKeyValues } from '../config';

const DEFAULT_BASE_PATH = path.resolve(process.cwd(), 'config');

export const Envs = (basePath = DEFAULT_BASE_PATH) => {
  const content = yaml.load(fs.readFileSync(path.resolve(basePath, 'envs-map.yml')));
  return mapFromKeyValues(content, process.env);
};

export const Defaults = (basePath = DEFAULT_BASE_PATH) => {
  return yaml.load(fs.readFileSync(path.resolve(basePath, 'defaults.yml')));
};
