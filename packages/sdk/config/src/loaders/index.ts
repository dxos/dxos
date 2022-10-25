//
// Copyright 2021 DXOS.org
//

import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

import { Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';

import { mapFromKeyValues } from '../config';
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
export const LocalStorage = <T = ConfigProto>(): T => ({} as T);

/**
 * Provided dynamically by server.
 */
export const Dynamics = <T = ConfigProto>(): T => ({} as T);

/**
 * ENV variable (key/value) map
 */
export const Envs = <T = ConfigProto>(basePath = DEFAULT_BASE_PATH): T => {
  const content = maybeLoadFile(path.resolve(basePath, FILE_ENVS));
  return content ? (mapFromKeyValues(content, process.env) as T) : ({} as T);
};

/**
 * JSON config.
 */
export const Defaults = <T = ConfigProto>(basePath = DEFAULT_BASE_PATH): T =>
  maybeLoadFile(path.resolve(basePath, FILE_DEFAULTS)) ?? ({} as T);
