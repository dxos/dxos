//
// Copyright 2020 DXOS.
//

//
// Copyright 2021 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

import { mapFromKeyValues } from '../config';
import { ConfigObject } from '../types';

const DEFAULT_BASE_PATH = path.resolve(process.cwd(), 'config');

/* NOTE: we need to export LocalStorage and Dynamics
 * for typescript to typecheck browser code.
 * See `ConfigPlugin.js:33`.
 */

export const LocalStorage = (): ConfigObject => ({});

export const Dynamics = (): ConfigObject => ({});

export const Envs = (basePath = DEFAULT_BASE_PATH): ConfigObject => {
  const content = yaml.load(fs.readFileSync(path.resolve(basePath, 'envs-map.yml'), { encoding: 'utf8' }));
  return mapFromKeyValues(content, process.env);
};

export const Defaults = (basePath = DEFAULT_BASE_PATH): ConfigObject => {
  return yaml.load(fs.readFileSync(path.resolve(basePath, 'defaults.yml'), { encoding: 'utf8' }));
};
