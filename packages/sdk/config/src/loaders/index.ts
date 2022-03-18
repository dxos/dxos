//
// Copyright 2021 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

import { mapFromKeyValues } from '../config';
import { ConfigObject } from '../proto';

const DEFAULT_BASE_PATH = path.resolve(process.cwd(), 'config');

/* NOTE: we need to export LocalStorage and Dynamics
 * for typescript to typecheck browser code.
 * See `ConfigPlugin.js:33`.
 */

export const LocalStorage = <T = ConfigObject>(): T => ({} as T);

export const Dynamics = <T = ConfigObject>(): T => ({} as T);

export const Envs = <T = ConfigObject>(basePath = DEFAULT_BASE_PATH): T => {
  const content = yaml.load(fs.readFileSync(path.resolve(basePath, 'envs-map.yml'), { encoding: 'utf8' }));
  return mapFromKeyValues(content, process.env) as T;
};

export const Defaults = <T = ConfigObject>(basePath = DEFAULT_BASE_PATH): T => {
  return yaml.load(fs.readFileSync(path.resolve(basePath, 'defaults.yml'), { encoding: 'utf8' }));
};
