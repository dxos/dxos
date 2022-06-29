//
// Copyright 2021 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

import { mapFromKeyValues } from '../config';
import { ConfigObject } from '../proto';
import { FILE_DEFAULTS, FILE_ENVS } from '../types';

const DEFAULT_BASE_PATH = path.resolve(process.cwd(), 'config');

const maybeLoadFile = (file: string): any => {
  try {
    return yaml.load(fs.readFileSync(file, { encoding: 'utf8' }));
  } catch (err: any) {
    // Ignored.
  }
};

//
// NOTE: Export LocalStorage and Dynamics for typescript to typecheck browser code (see ConfigPlugin).
//

/**
 * File storage.
 */
export const LocalStorage = <T = ConfigObject>(): T => ({} as T);

/**
 * Provided dynamically by server.
 */
export const Dynamics = <T = ConfigObject>(): T => ({} as T);

/**
 * ENV variable (key/value) map
 */
export const Envs = <T = ConfigObject>(basePath = DEFAULT_BASE_PATH): T => {
  const content = maybeLoadFile(path.resolve(basePath, FILE_ENVS));
  return content ? mapFromKeyValues(content, process.env) as T : {} as T;
};

/**
 * JSON config.
 */
export const Defaults = <T = ConfigObject>(basePath = DEFAULT_BASE_PATH): T => maybeLoadFile(path.resolve(basePath, FILE_DEFAULTS)) ?? {} as T;
